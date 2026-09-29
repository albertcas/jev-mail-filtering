export type Person = { name: string; address: string };

export type RawMessage = {
  folder: string;
  uid: number;
  messageId: string;
  inReplyTo: string | null;
  references: string[];
  from: Person;
  replyTo: Person | null;
  to: string[];
  subject: string;
  date: Date;
  text: string;
  links: { text: string; href: string }[];
  attachments: { filename: string; contentType: string }[];
  authenticationResults: string[];
  listUnsubscribe: string | null;
};

export type MailContext = {
  recipient: Person;
  /** Message-IDs of messages the recipient sent (Sent folder). */
  sentMessageIds: Set<string>;
  /** Lower-cased addresses the recipient has written to. */
  sentRecipients: Set<string>;
};

export type AuthResult = "pass" | "fail" | "none";

export type Signals = {
  sender_authentication: AuthResult;
  reply_to_differs_from_sender: boolean;
  domain_resembles: string | null;
  has_unsubscribe_header: boolean;
  recipient_has_replied_in_thread: boolean;
  recipient_has_written_to_sender_before: boolean;
  risky_attachments: boolean;
  mismatched_links: boolean;
};
