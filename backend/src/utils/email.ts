import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.qq.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: parseInt(process.env.SMTP_PORT || '465') === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'your-email@example.com',
        pass: process.env.SMTP_PASS || 'your-email-password',
      },
    };

    this.transporter = nodemailer.createTransport(config);
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    // 开发环境下可以跳过发送邮件
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n===============================`);
      console.log(`📧 开发模式 - 邮件信息`);
      console.log(`接收者: ${options.to}`);
      console.log(`主题: ${options.subject}`);
      console.log(`===============================\n`);
      // 注释下面这行以在开发环境中实际发送邮件进行测试
      // return;
    }

    try {
      const mailOptions = {
        from: process.env.MAIL_FROM || `"考研打卡系统" <${process.env.SMTP_USER || 'your-email@example.com'}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${options.to}`);
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendCheckInReminder(email: string, username: string, groupName: string): Promise<void> {
    const subject = '考研打卡提醒';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">考研打卡提醒</h2>
        <p>亲爱的 ${username}，</p>
        <p>你在小组 <strong>${groupName}</strong> 中还没有完成今天的打卡哦！</p>
        <p>快来记录一下今天的学习进度吧！</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">今日学习建议：</h3>
          <ul>
            <li>回顾昨天的学习内容</li>
            <li>制定今天的学习计划</li>
            <li>专注学习，保持良好状态</li>
          </ul>
        </div>
        <p>加油！坚持就是胜利！</p>
        <p style="color: #666; font-size: 12px;">此邮件由考研打卡系统自动发送</p>
      </div>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendWelcomeEmail(email: string, username: string): Promise<void> {
    const subject = '欢迎加入考研打卡平台';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">欢迎加入考研打卡平台！</h2>
        <p>亲爱的 ${username}，</p>
        <p>恭喜你成功注册考研打卡平台！</p>
        <p>在这里，你可以：</p>
        <ul>
          <li>记录每天的学习进度</li>
          <li>加入学习小组，与同学互相督促</li>
          <li>获得智能学习任务推荐</li>
          <li>查看学习统计和进度</li>
        </ul>
        <p>开始你的考研之旅吧！</p>
        <p style="color: #666; font-size: 12px;">此邮件由考研打卡系统自动发送</p>
      </div>
    `;

    await this.sendEmail({ to: email, subject, html });
  }
}

export const emailService = new EmailService();
export default emailService;