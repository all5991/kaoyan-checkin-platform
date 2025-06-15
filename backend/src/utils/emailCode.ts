import nodemailer from 'nodemailer';

// 验证码存储（生产环境应使用Redis）
const verificationCodes = new Map<string, { code: string; expires: number }>();

// 创建邮件传输器
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.qq.com',
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || 'your-email@example.com',
      pass: process.env.SMTP_PASS || 'your-email-password',
    },
  });
};

// 生成6位随机验证码
export const generateVerificationCode = (): string => {
  return Math.random().toString().slice(-6);
};

// 发送验证码邮件
export const sendVerificationCode = async (email: string, type: 'register' | 'reset' = 'register'): Promise<void> => {
  const code = generateVerificationCode();
  const expires = Date.now() + 5 * 60 * 1000; // 5分钟后过期
  
  // 存储验证码
  verificationCodes.set(email, { code, expires });
  
  // 开发环境下，始终在控制台显示验证码，方便测试
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n===============================`);
    console.log(`📧 开发模式 - 验证码信息`);
    console.log(`邮箱: ${email}`);
    console.log(`验证码: ${code}`);
    console.log(`有效期: 5分钟`);
    console.log(`===============================\n`);
    
    // 开发环境跳过实际发送邮件
    // 注释下面这行代码以实际发送邮件进行测试
    // return;
  }
  
  const transporter = createTransporter();
  
  const typeText = type === 'register' ? '注册' : '重置密码';
  const mailOptions = {
    from: `"考研打卡系统" <${process.env.MAIL_FROM || process.env.SMTP_USER || 'your-email@example.com'}>`,
    to: email,
    subject: `【考研打卡】${typeText}验证码`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">考研打卡系统</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">助力考研，每日进步</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin: 20px 0;">
          <h2 style="color: #333; margin-top: 0;">验证码确认</h2>
          <p style="color: #666; line-height: 1.6;">
            您正在进行<strong>${typeText}</strong>操作，请使用以下验证码完成验证：
          </p>
          
          <div style="background: white; border: 2px dashed #ddd; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; font-family: 'Courier New', monospace;">
              ${code}
            </div>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚠️ 重要提醒：</strong><br>
              • 验证码有效期为 <strong>5分钟</strong><br>
              • 请勿将验证码泄露给他人<br>
              • 如非本人操作，请忽略此邮件
            </p>
          </div>
        </div>
        
        <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
          <p>此邮件由系统自动发送，请勿回复</p>
          <p>距离2025年考研还有 ${Math.ceil((new Date('2025-12-20').getTime() - Date.now()) / (1000 * 60 * 60 * 24))} 天</p>
          <p>© 2025 考研打卡系统 - 助力每一个考研梦想</p>
        </div>
      </div>
    `,
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`验证码已发送到 ${email}: ${code}`);
  } catch (error) {
    console.error('发送邮件失败:', error);
    
    // 开发环境下，即使邮件发送失败也在控制台显示验证码
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n===============================`);
      console.log(`📧 邮件发送失败，但验证码依然有效`);
      console.log(`邮箱: ${email}`);
      console.log(`验证码: ${code}`);
      console.log(`有效期: 5分钟`);
      console.log(`===============================\n`);
      return;
    }
    
    throw new Error('发送验证码失败，请稍后重试');
  }
};

// 验证验证码
export const verifyCode = (email: string, inputCode: string): boolean => {
  const stored = verificationCodes.get(email);
  
  if (!stored) {
    return false; // 验证码不存在
  }
  
  if (Date.now() > stored.expires) {
    verificationCodes.delete(email); // 删除过期验证码
    return false; // 验证码已过期
  }
  
  if (stored.code !== inputCode) {
    return false; // 验证码错误
  }
  
  verificationCodes.delete(email); // 验证成功后删除验证码
  return true;
};

// 清理过期验证码（定时任务）
export const cleanupExpiredCodes = (): void => {
  const now = Date.now();
  for (const [email, data] of verificationCodes.entries()) {
    if (now > data.expires) {
      verificationCodes.delete(email);
    }
  }
};

// 每分钟清理一次过期验证码
setInterval(cleanupExpiredCodes, 60 * 1000);