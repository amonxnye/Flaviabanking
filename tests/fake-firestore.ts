// Minimal in-memory stand-in for the parts of firebase-admin Firestore the app
// uses. Enough for unit tests; not a full emulator.

type Data = Record<string, any>;
type Filter = { field: string; op: string; value: any };

const compare = (a: any, op: string, b: any) => {
  const av = a instanceof Date ? a.getTime() : a;
  const bv = b instanceof Date ? b.getTime() : b;
  switch (op) {
    case "==": return av === bv;
    case ">=": return av >= bv;
    case "<=": return av <= bv;
    case ">": return av > bv;
    case "<": return av < bv;
    case "in": return (bv as any[]).includes(av);
    default: throw new Error(`fake-firestore: unsupported op ${op}`);
  }
};

export class FakeFirestore {
  store = new Map<string, Map<string, Data>>();
  private seq = 0;

  col(name: string) {
    if (!this.store.has(name)) this.store.set(name, new Map());
    return this.store.get(name)!;
  }

  collection(name: string) {
    return new FakeQuery(this, name, []);
  }

  batch() {
    const ops: Array<() => void> = [];
    return {
      delete: (ref: FakeDocRef) => ops.push(() => this.col(ref.collectionName).delete(ref.id)),
      commit: async () => ops.forEach((op) => op()),
    };
  }

  nextId() {
    this.seq += 1;
    return `auto${this.seq}`;
  }

  /** Test helper: all docs of a collection as [id, data]. */
  all(name: string) {
    return Array.from(this.col(name).entries());
  }
}

class FakeSnap {
  constructor(readonly ref: FakeDocRef, private readonly value: Data | undefined) {}
  get id() { return this.ref.id; }
  get exists() { return this.value !== undefined; }
  data() { return this.value === undefined ? undefined : { ...this.value }; }
  get createTime() { return undefined; }
}

export class FakeDocRef {
  constructor(private readonly db: FakeFirestore, readonly collectionName: string, readonly id: string) {}
  private get map() { return this.db.col(this.collectionName); }
  async get() { return new FakeSnap(this, this.map.get(this.id)); }
  async set(data: Data) { this.map.set(this.id, { ...data }); }
  async create(data: Data) {
    if (this.map.has(this.id)) throw Object.assign(new Error("ALREADY_EXISTS"), { code: 6 });
    this.map.set(this.id, { ...data });
  }
  async update(patch: Data) {
    const cur = this.map.get(this.id);
    if (!cur) throw Object.assign(new Error("NOT_FOUND"), { code: 5 });
    this.map.set(this.id, { ...cur, ...patch });
  }
  async delete() { this.map.delete(this.id); }
}

class FakeQuery {
  constructor(
    private readonly db: FakeFirestore,
    private readonly name: string,
    private readonly filters: Filter[],
    private readonly max?: number
  ) {}

  doc(id?: string) { return new FakeDocRef(this.db, this.name, id ?? this.db.nextId()); }

  async add(data: Data) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }

  where(field: string, op: string, value: any) {
    return new FakeQuery(this.db, this.name, [...this.filters, { field, op, value }], this.max);
  }

  orderBy() { return this; }

  limit(n: number) { return new FakeQuery(this.db, this.name, this.filters, n); }

  private matches() {
    const rows = Array.from(this.db.col(this.name).entries()).filter(([, d]) =>
      this.filters.every((f) => compare(d[f.field], f.op, f.value))
    );
    return this.max === undefined ? rows : rows.slice(0, this.max);
  }

  async get() {
    const docs = this.matches().map(([id, d]) => new FakeSnap(new FakeDocRef(this.db, this.name, id), d));
    return { docs, empty: docs.length === 0, size: docs.length };
  }

  count() {
    return { get: async () => ({ data: () => ({ count: this.matches().length }) }) };
  }

  aggregate(spec: Record<string, { _field: string }>) {
    return {
      get: async () => {
        const out: Record<string, number> = {};
        for (const [k, v] of Object.entries(spec)) {
          out[k] = this.matches().reduce((sum, [, d]) => sum + (Number(d[v._field]) || 0), 0);
        }
        return { data: () => out };
      },
    };
  }
}

/** Module body for vi.mock("@/lib/firebase/admin"). */
export function fakeAdminModule(getDb: () => FakeFirestore, getAuth: () => Record<string, any> = () => ({})) {
  const toDoc = (snap: FakeSnap) => {
    if (!snap.exists) return null;
    const data = snap.data()!;
    const createdAt = data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt;
    return { $id: snap.id, ...data, createdAt, $createdAt: createdAt || new Date().toISOString() };
  };
  return {
    adminDb: () => getDb(),
    adminAuth: () => getAuth(),
    COLLECTIONS: {
      users: "users",
      banks: "banks",
      transactions: "transactions",
      auditLogs: "auditLogs",
      walletTransactions: "walletTransactions",
    },
    serverTimestamp: () => new Date(),
    toDoc,
    toDocs: (q: { docs: FakeSnap[] }) => q.docs.map(toDoc).filter(Boolean),
  };
}
