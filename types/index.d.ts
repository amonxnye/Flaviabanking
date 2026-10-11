/* eslint-disable no-unused-vars */

declare type SearchParamProps = {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// ========================================

declare type SignUpParams = {
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  dateOfBirth: string;
  email: string;
  password: string;
};

declare type LoginUser = {
  email: string;
  password: string;
};

declare type User = {
  $id: string;
  email: string;
  userId: string;
  firstName: string;
  lastName: string;
  name: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  dateOfBirth: string;
};

declare type NewUserParams = {
  userId: string;
  email: string;
  name: string;
  password: string;
};

/** A manually managed financial-institution account (Firestore `accounts`). */
declare type Account = {
  id: string;
  userId: string;
  name: string;
  institution: string;
  type: string;
  subtype: string;
  /** Last 4 digits of the account number, if given. */
  mask: string;
  /** ISO 4217 code, e.g. UGX. */
  currency: string;
  currentBalance: number;
  availableBalance: number;
  $createdAt?: string;
};

declare type Transaction = {
  id: string;
  $id: string;
  name: string;
  paymentChannel: string;
  type: string;
  accountId: string;
  amount: number;
  pending: boolean;
  category: string;
  date: string;
  image: string;
  $createdAt: string;
  channel: string;
  senderBankId: string;
  receiverBankId: string;
};

declare type AccountTypes =
  | "depository"
  | "credit"
  | "loan "
  | "investment"
  | "other";

declare type Category = "Food and Drink" | "Travel" | "Transfer";

declare type CategoryCount = {
  name: string;
  count: number;
  totalCount: number;
};

declare type Receiver = {
  firstName: string;
  lastName: string;
};

declare interface CreditCardProps {
  account: Account;
  userName: string;
}

declare interface BankInfoProps {
  account: Account;
  accountId?: string;
  type: "full" | "card";
}

declare interface HeaderBoxProps {
  type?: "title" | "greeting";
  title: string;
  subtext: string;
  user?: string;
}

declare interface MobileNavProps {
  user: User;
}

declare interface PageHeaderProps {
  topTitle: string;
  bottomTitle: string;
  topDescription: string;
  bottomDescription: string;
  connectBank?: boolean;
}

declare interface PaginationProps {
  page: number;
  totalPages: number;
}

// declare type User = sdk.Models.Document & {
//   accountId: string;
//   email: string;
//   name: string;
//   items: string[];
//   accessToken: string;
//   image: string;
// };

declare interface AuthFormProps {
  type: "sign-in" | "sign-up";
}

declare interface BankDropdownProps {
  accounts: Account[];
  setValue?: UseFormSetValue<any>;
  /** Form field written on change (default "senderBank"). */
  fieldName?: string;
  otherStyles?: string;
}

declare interface BankTabItemProps {
  account: Account;
  accountId?: string;
}

declare interface TotalBalanceBoxProps {
  accounts: Account[];
  totalBanks: number;
  totalCurrentBalance: number;
  currency?: string;
}

declare interface FooterProps {
  user: User;
  type?: 'mobile' | 'desktop'
}

declare interface RightSidebarProps {
  user: User;
  transactions: Transaction[];
  accounts: Account[];
}

declare interface SiderbarProps {
  user: User;
}

declare interface RecentTransactionsProps {
  accounts: Account[];
  transactions: Transaction[];
  accountId: string;
  page: number;
}

declare interface TransactionHistoryTableProps {
  transactions: Transaction[];
  page: number;
}

declare interface CategoryBadgeProps {
  category: string;
}

declare interface TransactionTableProps {
  transactions: Transaction[];
}

declare interface CategoryProps {
  category: CategoryCount;
}

declare interface DoughnutChartProps {
  accounts: Account[];
}

declare interface PaymentTransferFormProps {
  accounts: Account[];
}

// Actions
declare interface getAccountsProps {
  userId: string;
}

declare interface getAccountProps {
  accountId: string;
}

/** Internal transfer between two of the signed-in user's accounts. */
declare interface CreateTransactionProps {
  name: string;
  amount: string;
  senderBankId: string;
  receiverBankId: string;
}

declare interface getTransactionsByAccountIdProps {
  accountId: string;
}

declare interface signInProps {
  /** Firebase ID token obtained in the browser after signInWithEmailAndPassword. */
  idToken: string;
}

/** Sign-up data sent to the server after the Firebase Auth user was created in the browser. */
declare type CompleteSignUpParams = Omit<SignUpParams, "password"> & { idToken: string };

declare interface getUserInfoProps {
  userId: string;
}

// ========================================
// Enterprise & Self-Service Types
// ========================================

declare type PlanTier = 'free' | 'pro' | 'enterprise';

declare type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

declare interface UserProfile extends User {
  planTier?: PlanTier;
  organizationId?: string;
  role?: OrgRole;
}

declare interface AuditLogEntry {
  $id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  $createdAt: string;
}

declare interface SettingsPageProps {
  user: User;
}

declare interface PricingCardProps {
  currentPlan: string;
}

declare interface UsageDashboardProps {
  accountCount: number;
  currentPlan: string;
}
