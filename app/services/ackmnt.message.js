function acknowledgmentMessage(originalSubject, messageType) {
    switch (messageType) {
        case 'DOMAINID NOT VALID':
            return `Hello,

We noticed that your email domain is not allowed to send messages to this address. Unfortunately, we can only process emails from approved domains (e.g., Gmail.com). If you believe this is an error, please contact our support team for assistance.

Best regards,
Test1`;

    case 'ATTACHMENT MISSING':
        return `Hello,

We noticed that your email with the subject "${originalSubject}" was missing an attachment. Unfortunately, we can only process emails from approved domains (e.g., Gmail.com). 

If you believe this is an error or if you'd like to resend your email with the required attachment, please contact our support team for further assistance.

Best regards,
Test1`;

    case 'ENCRYPTED ATTACHMENTS':
            return `Hello,
We noticed that your email with the subject "${originalSubject}" have encrypted/password protected attachment. Unfortunately, we can only process emails from approved domains (e.g., Gmail.com). 
If you believe this is an error or if you'd like to resend your email with the required attachment, please contact our support team for further assistance.

Best regards,
    Test1`;
    
    case 'SUCCESS':
            return `Hello,
    
Thank you for your email. We have processed the files based on your attachments. 

Best regards,
Test1`;
    default:
        return `Hello,

Thank you for your email. We have received your message with the subject "${originalSubject}". Our team will review it and get back to you shortly.

Best regards,
Test1`;
    }
}

module.exports = acknowledgmentMessage;