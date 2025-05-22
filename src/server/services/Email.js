import { existsSync, readFileSync } from "fs";
import nodemailer from "nodemailer";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class Email {
  constructor(currentEmailDetails) {
    this.currentEmailDetails = currentEmailDetails;
    this.from = `${process.env["EMAIL_SENDER"]} <${process.env["EMAIL_FROM"]}>`;
  }

  // Create transporter based on environment.
  newTransport() {
    const smtpConfig = {
      host: process.env["EMAIL_HOST"],
      port: Number(process.env["EMAIL_PORT"]),
      secure: false,
      auth: {
        user: process.env["EMAIL_USERNAME"],
        pass: process.env["EMAIL_PASSWORD"],
      },
    };
    return nodemailer.createTransport(smtpConfig);
  }

  // send method responsible for sending actual emails.
  async send(template, subject, attachment = null) {
    const templatePath = join(
      __dirname,
      "../../../public/assets/email-templates",
      `${template}.html`
    );

    if (existsSync(templatePath)) {
      let html = readFileSync(templatePath, "utf8");

      // Replace all placeholders dynamically
      Object.keys(this.currentEmailDetails).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, "g"); // Match all occurrences
        html = html.replace(regex, this.currentEmailDetails[key]);
      });

      const mailOptions = {
        from: this.from,
        to: this.currentEmailDetails.to,
        subject,
        html,
      };

      if (attachment) {
        mailOptions.attachments = [
          { filename: attachment.name, content: attachment.content },
        ];
      }
      try {
        await this.newTransport().sendMail(mailOptions);
      } catch (error) {
        console.log(error);
      }
    }
  }

  async sendWelcome() {
    await this.send("welcomeUser", "Welcome");
  }

  async sendTest() {
    await this.send("test", "This email is only for test purpose!");
  }

  async sendErrorFile(content) {
    await this.send(
      "error",
      `Today: ${new Date(Date.now()).toLocaleString()} error Logs.`,
      content
    );
  }

  async sendPasswordReset() {
    await this.send(
      "passReset",
      "Your password reset token (valid for 10 minutes)"
    );
  }

  async sendRegisterOtp() {
    await this.send("registerOtp", "Your register otp (valid for 60 seconds)");
  }

  async sendContactUsDetails() {
    await this.send("contactUs", "New Contact Form Submission");
  }
}
