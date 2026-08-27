import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

export async function POST(
  request: Request
) {

  try {

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim()
        : "";

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";


    if (!name || !email || !message) {

      return NextResponse.json(
        {
          error:
            "Name, email and message are required.",
        },
        {
          status: 400,
        }
      );

    }


    if (!process.env.RESEND_API_KEY) {

      return NextResponse.json(
        {
          error:
            "RESEND_API_KEY is not configured.",
        },
        {
          status: 500,
        }
      );

    }


    const recipient =
      process.env.CONTACT_RECEIVER_EMAIL ||
      "marutijogdankar233@gmail.com";


    const { data, error } =
      await resend.emails.send({

        /*
         * Resend's testing sender can be used
         * while your domain is not verified.
         */
        from:
          "FocusFlow AI <onboarding@resend.dev>",

        to: [recipient],

        replyTo: email,

        subject:
          `FocusFlow AI Contact - ${name}`,

        html: `
          <div
            style="
              font-family: Arial, sans-serif;
              max-width: 650px;
              margin: auto;
              padding: 30px;
              color: #172033;
            "
          >

            <h1>
              New FocusFlow AI Contact Message
            </h1>

            <hr />

            <h3>
              Name
            </h3>

            <p>
              ${escapeHtml(name)}
            </p>

            <h3>
              Email
            </h3>

            <p>
              ${escapeHtml(email)}
            </p>

            <h3>
              Message
            </h3>

            <p
              style="
                white-space: pre-wrap;
                line-height: 1.7;
              "
            >
              ${escapeHtml(message)}
            </p>

          </div>
        `,
      });


    if (error) {

      console.error(
        "Resend error:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "Resend failed to send the email.",
        },
        {
          status:
            error.statusCode || 500,
        }
      );

    }


    return NextResponse.json(
      {
        success: true,
        id: data?.id,
      },
      {
        status: 200,
      }
    );


  } catch (error) {

    console.error(
      "Contact API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to send message. Please try again.",
      },
      {
        status: 500,
      }
    );

  }

}


function escapeHtml(
  value: string
) {

  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}