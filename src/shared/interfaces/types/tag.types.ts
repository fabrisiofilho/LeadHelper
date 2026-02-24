export interface Tag {
  id: number;
  userId: number;
  name: string;
  color: string;
  createdAt: Date;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

export interface TransactionTag {
  transactionId: number;
  tagId: number;
  tagName: string;
  tagColor: string;
}
