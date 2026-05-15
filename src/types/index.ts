import type {
  Client,
  User,
  ClientManager,
  MetaAccount,
  ClientSection,
  ClientAttachment,
  Report,
  Task,
  TaskComment,
  TaskLabel,
  Role,
} from "@prisma/client";

export type ClientWithRelations = Client & {
  managers: (ClientManager & { user: User })[];
  metaAccounts: MetaAccount[];
  reports: (Report & { generatedBy?: User })[];
  customSections: ClientSection[];
  attachments: ClientAttachment[];
  tasks: (Task & { assignee: User | null; labels: TaskLabel[] })[];
  _count: { reports: number; tasks: number };
};

export type ClientListItem = Client & {
  managers: (ClientManager & { user: User })[];
  metaAccounts: MetaAccount[];
  _count: { reports: number; tasks: number };
};

export type UserSummary = Pick<User, "id" | "name" | "email" | "role" | "tags" | "active">;

export type TaskWithRelations = Task & {
  client: { id: string; name: string } | null;
  assignee: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string; email: string };
  comments: (TaskComment & { user: { id: string; name: string } })[];
  labels: TaskLabel[];
};

export type { Role };
