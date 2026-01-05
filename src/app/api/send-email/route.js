import { auth } from "@/../auth";

export async function POST(req) {
    try {
        const session = await auth();
        if (!session || !session.accessToken) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { to, subject, htmlBody } = await req.json();

        if (!to || !subject || !htmlBody) {
            return Response.json({ error: "Missing fields" }, { status: 400 });
        }

        const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: {
                    subject: subject,
                    body: {
                        contentType: "HTML",
                        content: htmlBody,
                    },
                    toRecipients: [
                        {
                            emailAddress: {
                                address: to,
                            },
                        },
                    ],
                },
                saveToSentItems: "true",
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error sending email:", errorData);
            return Response.json({ error: "Failed to send email", details: errorData }, { status: 500 });
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error("Error in send-email API:", error);
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
