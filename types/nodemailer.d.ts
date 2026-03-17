declare module 'nodemailer' {
  export interface Transporter {
    sendMail(mailOptions: any, callback?: (err: Error | null, info: any) => void): Promise<any>;
    [key: string]: any;
  }
  
  export function createTransport(options: any): Transporter;
  
  const nodemailer: {
    createTransport: typeof createTransport;
  };
  
  export default nodemailer;
}

