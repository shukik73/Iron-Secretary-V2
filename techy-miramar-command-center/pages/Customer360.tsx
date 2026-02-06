import React, { useState } from "react";
import {
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Wrench,
  MessageSquare,
  Star,
  Clock,
  Search,
  Plus,
  Send,
  CreditCard,
  FileText,
  ChevronRight,
  Tag,
  Shield,
  TrendingUp,
  History,
  AlertCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimelineEvent {
  id: string;
  type:
    | "repair_created"
    | "status_change"
    | "payment"
    | "sms_sent"
    | "sms_received"
    | "note"
    | "review";
  date: string; // ISO-ish string
  title: string;
  description: string;
  detail?: string; // optional expandable detail
  amount?: number;
  rating?: number; // 1-5 for reviews
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  customerSince: string;
  lastVisit: string;
  totalSpent: number;
  outstandingBalance: number;
  totalRepairs: number;
  avgRepairDays: number;
  tags: string[];
  status: "active" | "inactive" | "vip";
  timeline: TimelineEvent[];
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "c1",
    name: "John Martinez",
    phone: "(305) 555-0142",
    email: "john.martinez@gmail.com",
    customerSince: "2023-06-15",
    lastVisit: "2026-02-03",
    totalSpent: 1845,
    outstandingBalance: 0,
    totalRepairs: 7,
    avgRepairDays: 2.1,
    tags: ["VIP", "Frequent"],
    status: "vip",
    timeline: [
      {
        id: "t1-1",
        type: "repair_created",
        date: "2026-02-03T10:22:00",
        title: "Repair Created — iPhone 15 Pro Max",
        description: "Cracked back glass replacement",
        detail:
          "Customer dropped phone on tile floor. Hairline cracks across entire back panel. AppleCare expired. Quoted $189 for OEM back glass replacement. Customer approved.",
      },
      {
        id: "t1-2",
        type: "sms_sent",
        date: "2026-02-03T14:45:00",
        title: "SMS Sent",
        description:
          "Hi John, your iPhone 15 Pro Max back glass replacement is done! Ready for pickup anytime today before 7 PM.",
      },
      {
        id: "t1-3",
        type: "payment",
        date: "2026-02-03T16:30:00",
        title: "Payment Received",
        description: "Back glass replacement — iPhone 15 Pro Max",
        amount: 189,
        detail: "Paid via Apple Pay. Tax included. No warranty claim.",
      },
      {
        id: "t1-4",
        type: "review",
        date: "2026-02-04T09:12:00",
        title: "Google Review Left",
        description:
          '"Fast turnaround as always. These guys are the best in Miramar!"',
        rating: 5,
      },
      {
        id: "t1-5",
        type: "note",
        date: "2026-01-10T11:00:00",
        title: "Staff Note Added",
        description:
          "John prefers text over calls. Always pays same-day. Great repeat customer — consider loyalty discount next visit.",
      },
    ],
  },
  {
    id: "c2",
    name: "Sarah Chen",
    phone: "(305) 555-0278",
    email: "sarah.chen@icloud.com",
    customerSince: "2024-01-20",
    lastVisit: "2026-01-28",
    totalSpent: 635,
    outstandingBalance: 149,
    totalRepairs: 3,
    avgRepairDays: 3.0,
    tags: ["Outstanding Balance"],
    status: "active",
    timeline: [
      {
        id: "t2-1",
        type: "repair_created",
        date: "2026-01-28T09:15:00",
        title: "Repair Created — Samsung Galaxy S24 Ultra",
        description: "Screen replacement + battery replacement",
        detail:
          "Screen has dead pixels in bottom-left quadrant. Battery health at 71%. Quoted $249 screen + $89 battery. Customer approved screen, wants to think about battery. Update: approved both.",
      },
      {
        id: "t2-2",
        type: "status_change",
        date: "2026-01-29T13:00:00",
        title: "Status Changed — In Progress",
        description:
          "Parts arrived. Technician Mike assigned. Estimated completion tomorrow AM.",
      },
      {
        id: "t2-3",
        type: "sms_sent",
        date: "2026-01-30T10:20:00",
        title: "SMS Sent",
        description:
          "Hi Sarah, your Galaxy S24 Ultra is ready! Screen and battery both replaced. Total is $338. We're open until 7 PM.",
      },
      {
        id: "t2-4",
        type: "payment",
        date: "2026-01-30T17:45:00",
        title: "Partial Payment Received",
        description: "Screen replacement portion paid",
        amount: 189,
        detail:
          "Customer paid $189 toward $338 total. Outstanding balance: $149. Customer will return Friday to pay remainder.",
      },
    ],
  },
  {
    id: "c3",
    name: "Mike Thompson",
    phone: "(954) 555-0391",
    email: "mike.t@outlook.com",
    customerSince: "2025-03-10",
    lastVisit: "2026-01-15",
    totalSpent: 279,
    outstandingBalance: 0,
    totalRepairs: 2,
    avgRepairDays: 1.5,
    tags: [],
    status: "active",
    timeline: [
      {
        id: "t3-1",
        type: "repair_created",
        date: "2026-01-15T11:30:00",
        title: "Repair Created — iPad Air (5th Gen)",
        description: "Charging port not working — intermittent connection",
        detail:
          "Port has lint buildup and possible pin damage. Cleaned port first — still intermittent. Replacing Lightning connector assembly. Quoted $129.",
      },
      {
        id: "t3-2",
        type: "status_change",
        date: "2026-01-15T15:00:00",
        title: "Status Changed — Completed",
        description:
          "Charging port replaced successfully. Tested with multiple cables. Charging stable at 20W.",
      },
      {
        id: "t3-3",
        type: "payment",
        date: "2026-01-15T16:10:00",
        title: "Payment Received",
        description: "Charging port replacement — iPad Air",
        amount: 129,
        detail: "Paid via Visa ending 4821. 30-day warranty on repair.",
      },
      {
        id: "t3-4",
        type: "sms_received",
        date: "2026-01-20T08:45:00",
        title: "SMS Received",
        description:
          '"Hey, iPad is charging perfectly now. Thanks for the quick fix!"',
      },
    ],
  },
  {
    id: "c4",
    name: "Diana Reyes",
    phone: "(786) 555-0517",
    email: "diana.reyes@yahoo.com",
    customerSince: "2022-11-05",
    lastVisit: "2026-02-01",
    totalSpent: 2310,
    outstandingBalance: 0,
    totalRepairs: 11,
    avgRepairDays: 1.8,
    tags: ["VIP", "Frequent"],
    status: "vip",
    timeline: [
      {
        id: "t4-1",
        type: "repair_created",
        date: "2026-02-01T09:00:00",
        title: "Repair Created — iPhone 14",
        description: "Water damage — phone fell in pool",
        detail:
          "Liquid Contact Indicators triggered. Phone boots but camera and speaker crackling. Quoted diagnostic first at $49, waived for VIP. Full board clean + speaker replacement estimated $199-$279.",
      },
      {
        id: "t4-2",
        type: "status_change",
        date: "2026-02-01T14:30:00",
        title: "Status Changed — Diagnostic Complete",
        description:
          "Board corrosion minimal. Speaker module damaged. Camera module OK after cleaning. Final quote: $219 (speaker + board clean).",
      },
      {
        id: "t4-3",
        type: "sms_sent",
        date: "2026-02-01T14:35:00",
        title: "SMS Sent",
        description:
          "Hi Diana, diagnostic done on your iPhone 14. Good news — camera is fine! Just need speaker replacement + board cleaning. Total $219. Want us to go ahead?",
      },
      {
        id: "t4-4",
        type: "sms_received",
        date: "2026-02-01T14:52:00",
        title: "SMS Received",
        description: '"Yes please go ahead! You guys always take care of me 🙏"',
      },
      {
        id: "t4-5",
        type: "payment",
        date: "2026-02-02T11:00:00",
        title: "Payment Received",
        description: "Water damage repair — iPhone 14",
        amount: 219,
        detail:
          "Paid via Zelle. VIP loyalty discount applied ($30 off). Original quote was $249.",
      },
    ],
  },
  {
    id: "c5",
    name: "Carlos Gutierrez",
    phone: "(305) 555-0683",
    email: "carlos.g@gmail.com",
    customerSince: "2025-08-22",
    lastVisit: "2025-12-18",
    totalSpent: 89,
    outstandingBalance: 0,
    totalRepairs: 1,
    avgRepairDays: 4.0,
    tags: [],
    status: "inactive",
    timeline: [
      {
        id: "t5-1",
        type: "repair_created",
        date: "2025-12-14T13:00:00",
        title: "Repair Created — Google Pixel 8",
        description: "Cracked screen — still functional but spreading",
        detail:
          "Impact point top-right corner. Crack spreading diagonally. Touch still works. Quoted $179 for OEM screen. Customer wants to check insurance first.",
      },
      {
        id: "t5-2",
        type: "sms_sent",
        date: "2025-12-16T10:00:00",
        title: "SMS Sent",
        description:
          "Hi Carlos, following up on your Pixel 8 screen. Did you hear back from insurance? We have the part ready whenever you are.",
      },
      {
        id: "t5-3",
        type: "sms_received",
        date: "2025-12-17T09:30:00",
        title: "SMS Received",
        description:
          '"Insurance won\'t cover it. Let\'s do it — can I bring it in tomorrow?"',
      },
      {
        id: "t5-4",
        type: "payment",
        date: "2025-12-18T16:00:00",
        title: "Payment Received",
        description: "Screen replacement — Pixel 8",
        amount: 89,
        detail:
          "Applied first-time customer discount: $90 off ($179 -> $89). Paid via debit card.",
      },
    ],
  },
  {
    id: "c6",
    name: "Angela Brooks",
    phone: "(954) 555-0824",
    email: "angela.brooks@me.com",
    customerSince: "2024-07-01",
    lastVisit: "2026-02-05",
    totalSpent: 1120,
    outstandingBalance: 299,
    totalRepairs: 5,
    avgRepairDays: 2.4,
    tags: ["Frequent", "Outstanding Balance"],
    status: "active",
    timeline: [
      {
        id: "t6-1",
        type: "repair_created",
        date: "2026-02-05T10:00:00",
        title: "Repair Created — MacBook Air M2",
        description: "Liquid spill on keyboard — multiple keys unresponsive",
        detail:
          "Coffee spill yesterday. Keys Q, W, A, S, D, Z not registering. Trackpad works. Quoted $299 for top-case replacement (keyboard integrated). AppleCare expired 2 months ago.",
      },
      {
        id: "t6-2",
        type: "status_change",
        date: "2026-02-05T10:30:00",
        title: "Status Changed — Waiting for Parts",
        description:
          "Top-case assembly ordered from supplier. ETA 2-3 business days.",
      },
      {
        id: "t6-3",
        type: "note",
        date: "2026-02-05T10:35:00",
        title: "Staff Note Added",
        description:
          "Angela mentioned she needs the laptop for work by Friday. Flagged as priority. Check with supplier for expedited shipping.",
      },
      {
        id: "t6-4",
        type: "sms_sent",
        date: "2026-02-05T11:00:00",
        title: "SMS Sent",
        description:
          "Hi Angela, we've ordered the top-case for your MacBook Air. Aiming to have it done by Thursday. We'll keep you posted!",
      },
      {
        id: "t6-5",
        type: "sms_received",
        date: "2026-02-05T11:12:00",
        title: "SMS Received",
        description:
          '"Thank you so much! I really need it for a presentation Friday morning. Please let me know ASAP."',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusBadge(status: Customer["status"]) {
  switch (status) {
    case "vip":
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
          <Shield className="w-3 h-3" />
          VIP
        </span>
      );
    case "active":
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          Active
        </span>
      );
    case "inactive":
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
          Inactive
        </span>
      );
  }
}

function tagBadge(tag: string) {
  const colors: Record<string, string> = {
    VIP: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Frequent: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    "Outstanding Balance":
      "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const cls = colors[tag] ?? "bg-gray-500/15 text-gray-400 border-gray-500/30";
  return (
    <span
      key={tag}
      className={`px-2 py-0.5 text-xs rounded-full border ${cls} flex items-center gap-1`}
    >
      <Tag className="w-3 h-3" />
      {tag}
    </span>
  );
}

function timelineIcon(type: TimelineEvent["type"]) {
  switch (type) {
    case "repair_created":
      return <Wrench className="w-4 h-4 text-blue-400" />;
    case "status_change":
      return <TrendingUp className="w-4 h-4 text-purple-400" />;
    case "payment":
      return <DollarSign className="w-4 h-4 text-emerald-400" />;
    case "sms_sent":
      return <Send className="w-4 h-4 text-cyan-400" />;
    case "sms_received":
      return <MessageSquare className="w-4 h-4 text-teal-400" />;
    case "note":
      return <FileText className="w-4 h-4 text-yellow-400" />;
    case "review":
      return <Star className="w-4 h-4 text-amber-400" />;
  }
}

function timelineDotColor(type: TimelineEvent["type"]): string {
  switch (type) {
    case "repair_created":
      return "border-blue-500";
    case "status_change":
      return "border-purple-500";
    case "payment":
      return "border-emerald-500";
    case "sms_sent":
      return "border-cyan-500";
    case "sms_received":
      return "border-teal-500";
    case "note":
      return "border-yellow-500";
    case "review":
      return "border-amber-500";
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CustomerListItem({
  customer,
  isActive,
  onClick,
}: {
  key?: React.Key;
  customer: Customer;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b border-gray-800/30 transition-colors cursor-pointer ${
        isActive
          ? "bg-white/10 border-l-2 border-l-blue-500"
          : "hover:bg-white/5 border-l-2 border-l-transparent"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-white text-sm">{customer.name}</span>
        {statusBadge(customer.status)}
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(customer.lastVisit)}
        </span>
        <span className="flex items-center gap-1">
          <Wrench className="w-3 h-3" />
          {customer.totalRepairs} repairs
        </span>
      </div>
      {customer.outstandingBalance > 0 && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="w-3 h-3" />
          {formatCurrency(customer.outstandingBalance)} outstanding
        </div>
      )}
    </button>
  );
}

function StatsRow({ customer }: { customer: Customer }) {
  const stats = [
    {
      label: "Total Repairs",
      value: customer.totalRepairs.toString(),
      icon: <Wrench className="w-5 h-5 text-blue-400" />,
    },
    {
      label: "Total Spent",
      value: formatCurrency(customer.totalSpent),
      icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
    },
    {
      label: "Outstanding",
      value: formatCurrency(customer.outstandingBalance),
      icon: <AlertCircle className="w-5 h-5 text-red-400" />,
    },
    {
      label: "Avg Repair Time",
      value: `${customer.avgRepairDays}d`,
      icon: <Clock className="w-5 h-5 text-purple-400" />,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white/5 backdrop-blur-sm border border-gray-800/50 p-4 rounded-xl"
        >
          <div className="flex items-center justify-between mb-2">
            {s.icon}
          </div>
          <div className="text-xl font-semibold text-white">{s.value}</div>
          <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function TimelineItem({ event }: { key?: React.Key; event: TimelineEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative pl-6">
      {/* Dot on the timeline */}
      <div
        className={`absolute -left-[29px] w-4 h-4 rounded-full bg-gray-900 border-2 ${timelineDotColor(
          event.type
        )} flex items-center justify-center`}
      />

      <div className="bg-white/5 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4 hover:bg-white/[0.07] transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 shrink-0">{timelineIcon(event.type)}</div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white">
                {event.title}
              </div>
              <div className="text-sm text-gray-400 mt-0.5">
                {event.description}
              </div>
              {event.amount !== undefined && (
                <div className="text-sm font-medium text-emerald-400 mt-1">
                  {formatCurrency(event.amount)}
                </div>
              )}
              {event.rating !== undefined && (
                <div className="flex items-center gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < event.rating!
                          ? "text-amber-400 fill-amber-400"
                          : "text-gray-600"
                      }`}
                    />
                  ))}
                </div>
              )}
              {expanded && event.detail && (
                <div className="mt-3 p-3 bg-white/5 rounded-lg text-xs text-gray-300 leading-relaxed border border-gray-800/30">
                  {event.detail}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatDateTime(event.date)}
            </span>
            {event.detail && (
              <button
                onClick={() => setExpanded(!expanded)}
                className={`p-1 rounded-lg hover:bg-white/10 transition-transform ${
                  expanded ? "rotate-90" : ""
                }`}
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="flex items-center gap-3">
      <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors text-sm font-medium">
        <Send className="w-4 h-4" />
        Send Text
      </button>
      <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/30 transition-colors text-sm font-medium">
        <Wrench className="w-4 h-4" />
        Create Repair
      </button>
      <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors text-sm font-medium">
        <CreditCard className="w-4 h-4" />
        Log Payment
      </button>
      <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-600/30 transition-colors text-sm font-medium">
        <Plus className="w-4 h-4" />
        Add Note
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Customer360() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredCustomers = MOCK_CUSTOMERS.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCustomer = MOCK_CUSTOMERS.find((c) => c.id === selectedId);

  // Sort timeline events newest-first
  const sortedTimeline = selectedCustomer
    ? [...selectedCustomer.timeline].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    : [];

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* ----------------------------------------------------------------- */}
      {/* Left Panel — Customer List                                        */}
      {/* ----------------------------------------------------------------- */}
      <div className="w-80 shrink-0 border-r border-gray-800/50 flex flex-col h-full">
        {/* Search */}
        <div className="p-4 border-b border-gray-800/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-gray-800/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {filteredCustomers.length} customer
            {filteredCustomers.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {filteredCustomers.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No customers match your search.
            </div>
          ) : (
            filteredCustomers.map((c) => (
              <CustomerListItem
                key={c.id}
                customer={c}
                isActive={c.id === selectedId}
                onClick={() => setSelectedId(c.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Right Panel — Customer Detail or Empty State                      */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto">
        {!selectedCustomer ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-gray-800/50 flex items-center justify-center mb-6">
              <User className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-400 mb-2">
              Customer 360 View
            </h2>
            <p className="text-gray-500 text-sm max-w-md">
              Select a customer from the list to view their full history,
              repairs, payments, communications, and more.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Profile Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-gray-700/50 flex items-center justify-center text-2xl font-bold text-white">
                  {selectedCustomer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {selectedCustomer.name}
                  </h1>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {selectedCustomer.phone}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {selectedCustomer.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Customer since{" "}
                      {formatDate(selectedCustomer.customerSince)}
                    </span>
                    <span className="flex items-center gap-1">
                      <History className="w-3 h-3" />
                      Last visit {formatDate(selectedCustomer.lastVisit)}
                    </span>
                  </div>
                  {/* Tags */}
                  {selectedCustomer.tags.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      {selectedCustomer.tags.map((t) => tagBadge(t))}
                    </div>
                  )}
                </div>
              </div>

              {/* Lifetime Value */}
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Lifetime Value
                </div>
                <div className="text-3xl font-bold text-emerald-400">
                  {formatCurrency(selectedCustomer.totalSpent)}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <StatsRow customer={selectedCustomer} />

            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                Quick Actions
              </h3>
              <QuickActions />
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                <History className="w-4 h-4" />
                Timeline
                <span className="text-xs text-gray-600">
                  ({sortedTimeline.length} events)
                </span>
              </h3>
              <div className="relative border-l-2 border-gray-800 ml-4 pl-6 space-y-6">
                {sortedTimeline.map((event) => (
                  <TimelineItem key={event.id} event={event} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
