import { api } from './api';

/** One row of the variations table, as the assistant sees it (all text). `options` maps an option name to this row's value. */
export interface ProductChatVariant {
  options: Record<string, string>;
  stock?: string;
  price?: string;
  salePrice?: string;
  cost?: string;
  sku?: string;
  barcode?: string;
  weight?: string;
  /** The photo ref (P1, P2...) this row shows. */
  photo?: string;
}

/** What the open product form holds right now, all as text (the server's ProductChatFormDto). */
export interface ProductChatForm {
  name?: string;
  description?: string;
  summary?: string;
  price?: string;
  discountPrice?: string;
  cost?: string;
  sku?: string;
  barcode?: string;
  stockQuantity?: string;
  weight?: string;
  weightUnit?: string;
  category?: string;
  subCategory?: string;
  brand?: string;
  metaTitle?: string;
  metaDescription?: string;
  visibility?: 'PUBLIC' | 'DRAFT';
  videoUrl?: string;
  badge?: string;
  minOrder?: string;
  maxOrder?: string;
  maxPerPhone?: string;
  lowStockAlert?: string;
  preOrder?: boolean;
  note?: string;
  searchKeywords?: string[];
  variations?: { name: string; values: string[] }[];
  variants?: ProductChatVariant[];
  photoOption?: string;
}

export interface ProductChatCategory {
  name: string;
  parent?: string;
}

/** A photo of the product named for the assistant: P1 is the cover, then the gallery order. */
export interface ProductChatPhoto {
  ref: string;
  url: string;
  isNew: boolean;
  note?: string;
}

/** The product fields the assistant can set. */
export type SetFieldName =
  | 'name'
  | 'description'
  | 'summary'
  | 'price'
  | 'discountPrice'
  | 'cost'
  | 'stockQuantity'
  | 'sku'
  | 'barcode'
  | 'weight'
  | 'weightUnit'
  | 'category'
  | 'subCategory'
  | 'brand'
  | 'metaTitle'
  | 'metaDescription'
  | 'visibility'
  | 'videoUrl'
  | 'badge'
  | 'minOrder'
  | 'maxOrder'
  | 'maxPerPhone'
  | 'lowStockAlert'
  | 'preOrder'
  | 'note';

export interface VariantData {
  price?: string;
  salePrice?: string;
  cost?: string;
  stock?: string;
  sku?: string;
  barcode?: string;
  weight?: string;
}

/** One checked edit (server: ProductChatOp, kept in step by hand). Rich text comes as HTML; numbers as plain digits. */
export type ProductChatOp =
  | { op: 'set'; field: SetFieldName; value: string }
  | { op: 'add_words'; values: string[] }
  | { op: 'set_options'; optionList: { name: string; values: string[] }[] }
  | { op: 'add_value'; option: string; value: string }
  | { op: 'rename_value'; option: string; value: string; to: string }
  | { op: 'rename_option'; option: string; to: string }
  | { op: 'add_variant'; combo: Record<string, string>; base?: string; data: VariantData; photo?: string; photoOption?: string }
  | { op: 'update_variant'; combo: Record<string, string>; data: VariantData; photo?: string; photoOption?: string }
  | { op: 'remove_value'; option: string; value: string }
  | { op: 'remove_option'; option: string }
  | { op: 'assign_photo'; photo: string; option: string; value: string }
  | { op: 'remove_photo'; photo: string }
  | { op: 'make_cover'; photo: string };

export interface ProductChatAnswer {
  reply: string;
  ops: ProductChatOp[];
  notes: string[];
  photoNotes: { url: string; note: string }[];
}

export interface ProductChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const productAiChatApi = {
  /** Add/Edit Product's AI chat. Nothing is saved: the answer's edits go into the open form. Paid in AI Credits. */
  chat: (body: { messages: ProductChatMessage[]; form: ProductChatForm; categories: ProductChatCategory[]; photos: ProductChatPhoto[] }) =>
    api.post<ProductChatAnswer>('/v1/products/ai-chat', body).then((r) => r.data),
};
