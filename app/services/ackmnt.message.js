function formatDate(date) {
    try {
        const formattedDate = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(new Date(date));
        return formattedDate;
    } catch (error) {
        return date;
    }
}


function acknowledgmentMessage(clientName, senderName, originalSubject, messageType, batchAttachmentList) {
    const tableRows = batchAttachmentList && batchAttachmentList.length > 0 ? batchAttachmentList.map(detail => `
        <tr style="border-bottom: 1px solid #444444;">
            <td style="font-size: 11px; text-align: left; border-left: 1px solid #444444; padding: 5px;">${detail.originalFileName}</td>
            <td style="font-size: 11px; text-align: left; border-left: 1px solid #444444; padding: 5px;">${formatDate(detail.receivedDateTime)}</td>
        </tr>
    `).join('') : '';

    const emailHtml = `
            <table style="border: 1px solid #1C6EA4; background-color: #EEEEEE; width: 100%; text-align: left; border-collapse: collapse; table-layout: auto;">
                <thead>
                    <tr style="background: #1C6EA4; border-bottom: 1px solid #444444;">
                        <th style="font-size: 12px; font-weight: bold; text-align: left; color: #FFFFFF; border-left: 1px solid #D0E4F5; padding: 5px;">Filename</th>
                        <th style="font-size: 12px; font-weight: bold; text-align: left; color: #FFFFFF; border-left: 1px solid #D0E4F5; padding: 5px;">Received DateTime</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;

    switch (messageType) {
        case 'DOMAINID NOT VALID':
            return `Hello ${senderName},
<br>
<br>
We noticed that your email domain is not allowed to send messages to this address. Unfortunately, we can only process emails 
from approved domains (e.g., Gmail.com). If you believe this is an error, please contact our support team for assistance.
<br>
<br>
Best regards,<br>
${clientName}`;

        case 'FW or RE Email':
            return `Hello ${senderName},
<br>
<br>
We noticed that your email contains forwared or replied. Unfortunately, we can't process this email. 
If you believe this is an error, please contact our support team for assistance.
<br>
<br>
Best regards,<br>
${clientName}`;

        case 'ATTACHMENT MISSING':
            return `Hello ${senderName},
<br>
<br>
We noticed that your email with the subject "${originalSubject}" was missing an attachment. If you believe this is an error or if you'd like to resend your email with the required attachment, <br>
please contact our support team for further assistance.
<br>
<br>
Best regards,<br>
${clientName}`;

        case 'ENCRYPTED ATTACHMENTS':
            return `Hello ${senderName},
<br>
<br>
We noticed that your email with the subject "${originalSubject}" have encrypted/password protected attachment.<br>
If you believe this is an error or if you'd like to resend your email <br> 
with the required attachment, please contact our support team for further assistance.<br>
<br>
<h4>Encrypted/Password protected File Details</h4>
<br>
    ${emailHtml}
<br>
<br>
<br>
Best regards,<br>
${clientName}`;

        case 'SUCCESS':
            return `Hello ${senderName},
<br>
<br>
Thank you for your email. The below-listed file(s) email attachments were processed successfully.<br>
<br>
<h4>Processed File Details</h4>
<br>
    ${emailHtml}
<br>
<br>
Best regards,<br>
${clientName}`;

        default:
            return `Hello ${senderName},
<br>
<br>
Thank you for your email. We have received your message with the subject "${originalSubject}".<br> 
Our team will review it and get back to you shortly.
<br>
<br>
Best regards,<br>
${clientName}`;
    }
}

module.exports = acknowledgmentMessage;