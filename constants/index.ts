import { ArrowLeftRight, Home, Landmark, MessageSquare, ReceiptText, Settings, Wallet } from "lucide-react";

export const sidebarLinks = [
  {
    icon: Home,
    route: "/",
    label: "Home",
  },
  {
    icon: Landmark,
    route: "/my-banks",
    label: "My banks",
  },
  {
    icon: ReceiptText,
    route: "/transaction-history",
    label: "Transaction history",
  },
  {
    icon: ArrowLeftRight,
    route: "/payment-transfer",
    label: "Transfer funds",
  },
  {
    icon: Wallet,
    route: "/wallet",
    label: "Wallet",
  },
  {
    icon: MessageSquare,
    route: "/assistant",
    label: "Assistant",
  },
  {
    icon: Settings,
    route: "/settings",
    label: "Settings",
  },
];

// good_user / good_password - Bank of America
export const TEST_USER_ID = "6627ed3d00267aa6fa3e";

// custom_user -> Chase Bank
// export const TEST_ACCESS_TOKEN =
//   "access-sandbox-da44dac8-7d31-4f66-ab36-2238d63a3017";

// custom_user -> Chase Bank
export const TEST_ACCESS_TOKEN =
  "access-sandbox-229476cf-25bc-46d2-9ed5-fba9df7a5d63";

export const ITEMS = [
  {
    id: "6624c02e00367128945e", // appwrite item Id
    accessToken: "access-sandbox-83fd9200-0165-4ef8-afde-65744b9d1548",
    itemId: "VPMQJKG5vASvpX8B6JK3HmXkZlAyplhW3r9xm",
    userId: "6627ed3d00267aa6fa3e",
    accountId: "X7LMJkE5vnskJBxwPeXaUWDBxAyZXwi9DNEWJ",
  },
  {
    id: "6627f07b00348f242ea9", // appwrite item Id
    accessToken: "access-sandbox-74d49e15-fc3b-4d10-a5e7-be4ddae05b30",
    itemId: "Wv7P6vNXRXiMkoKWPzeZS9Zm5JGWdXulLRNBq",
    userId: "6627ed3d00267aa6fa3e",
    accountId: "x1GQb1lDrDHWX4BwkqQbI4qpQP1lL6tJ3VVo9",
  },
];

// Categories and statuses are a small colored dot next to neutral text.
export const categoryColors: Record<string, string> = {
  "Food and Drink": "bg-[#C26B2B]",
  Travel: "bg-[#2F7D86]",
  Transfer: "bg-[#6B5BA7]",
  Payment: "bg-[#4B6584]",
  "Bank Fees": "bg-[#93570A]",
  Processing: "bg-caution",
  Success: "bg-positive",
  default: "bg-ink-3",
};
