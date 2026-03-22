declare module 'nodemailer' {
  export interface Transporter {
    sendMail(mailOptions: Record<string, unknown>, callback?: (err: Error | null, info: unknown) => void): Promise<unknown>;
    [key: string]: unknown;
  }
  
  export function createTransport(options: Record<string, unknown>): Transporter;
  
  const nodemailer: {
    createTransport: typeof createTransport;
  };
  
  export default nodemailer;
}

