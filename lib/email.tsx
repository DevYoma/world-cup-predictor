import React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Link,
  Button,
  Hr,
  Preview,
  Tailwind,
} from "@react-email/components";
import { render } from "@react-email/render";

interface UpcomingMatchData {
  homeTeamName: string;
  awayTeamName: string;
  kickoffAt: Date;
}

interface PredictionReminderEmailProps {
  displayName: string;
  upcomingMatches: UpcomingMatchData[];
  actionUrl: string;
  unsubscribeUrl: string;
}

export function PredictionReminderEmail({
  displayName,
  upcomingMatches,
  actionUrl,
  unsubscribeUrl,
}: PredictionReminderEmailProps) {
  const matchesCount = upcomingMatches.length;

  return (
    <Html lang="en">
      <Head />
      <Preview>{`⚽ Reminder: ${matchesCount} Upcoming World Cup Predictions Pending!`}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                zinc: {
                  950: "#09090b",
                  900: "#18181b",
                  800: "#27272a",
                  700: "#3f3f46",
                  600: "#52525b",
                  500: "#71717a",
                  400: "#a1a1aa",
                  300: "#d4d4d8",
                  200: "#e4e4e7",
                  100: "#f4f4f5",
                  50: "#fafafa",
                },
                amber: {
                  500: "#f59e0b",
                  400: "#fbbf24",
                },
              },
            },
          },
        }}
      >
        <Body className="bg-zinc-950 text-zinc-100 font-sans my-auto mx-auto px-2">
          <Container className="border border-solid border-zinc-800 bg-zinc-900 rounded-2xl my-[40px] mx-auto p-[32px] max-w-[465px] border-t-4 border-t-amber-500 shadow-xl">
            <Section className="text-center">
              <Heading className="text-amber-500 text-[24px] font-black tracking-tighter m-0 uppercase">
                World Cup Predictor
              </Heading>
              <Text className="text-zinc-400 text-[10px] tracking-widest uppercase m-0 mt-1">
                Prediction Reminder
              </Text>
            </Section>

            <Section className="mt-[32px]">
              <Text className="text-zinc-200 text-[16px] font-bold m-0">
                Hey {displayName || "Predictor"},
              </Text>
              <Text className="text-zinc-300 text-[14px] leading-[22px] mt-2">
                You have <strong>{matchesCount}</strong> upcoming World Cup match{matchesCount > 1 ? "es" : ""} that you haven't predicted yet! Lock in your score predictions before kickoff to secure your points.
              </Text>
            </Section>

            <Section className="mt-[24px] bg-zinc-950 border border-solid border-zinc-800 rounded-xl overflow-hidden p-2">
              <table className="w-full border-collapse">
                <tbody>
                  {upcomingMatches.map((match, idx) => {
                    const formattedTime = new Date(match.kickoffAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZoneName: "short",
                    });
                    const formattedDate = new Date(match.kickoffAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: idx < matchesCount - 1 ? "1px solid #27272a" : "none",
                        }}
                      >
                        <td className="p-3 text-[14px] font-bold text-zinc-100">
                          {match.homeTeamName} vs {match.awayTeamName}
                        </td>
                        <td className="p-3 text-right text-[12px] text-zinc-400">
                          {formattedDate} at {formattedTime}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Section>

            <Section className="text-center mt-[32px]">
              <Button
                href={actionUrl}
                className="bg-amber-500 text-zinc-950 px-[32px] py-[12px] rounded-xl text-[14px] font-extrabold uppercase tracking-wide decoration-none text-center cursor-pointer"
              >
                Submit Predictions
              </Button>
              <Text className="text-zinc-500 text-[11px] mt-3 m-0">
                Predictions lock automatically exactly at kickoff.
              </Text>
            </Section>

            <Hr className="border border-solid border-zinc-800 my-[24px]" />

            <Section className="text-center">
              <Text className="text-zinc-600 text-[11px] leading-[18px] m-0">
                You are receiving this daily reminder email because you enabled notifications.
              </Text>
              <Text className="text-zinc-500 text-[11px] mt-2 m-0">
                <Link href={unsubscribeUrl} className="text-zinc-400 underline">
                  Unsubscribe from reminders
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

/**
 * Sends an email using Brevo's REST API.
 */
export async function sendEmail({
  to,
  subject,
  htmlContent,
}: {
  to: string;
  subject: string;
  htmlContent: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("BREVO_API_KEY is not defined");
    return { success: false, error: "BREVO_API_KEY is not defined" };
  }

  const senderEmail = process.env.SENDER_EMAIL || "noreply@worldcuppredictor.com";
  
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "World Cup Predictor",
          email: senderEmail,
        },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Brevo API returned status ${res.status}: ${errorText}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error("Failed to send email via Brevo REST API:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

/**
 * Sends a premium reminder email for upcoming unpredicted matches.
 */
export async function sendReminderEmail({
  email,
  displayName,
  upcomingMatches,
  userId,
}: {
  email: string;
  displayName: string;
  upcomingMatches: UpcomingMatchData[];
  userId: string;
}) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const unsubscribeUrl = `${appUrl}/unsubscribe?userId=${encodeURIComponent(userId)}`;
  const actionUrl = `${appUrl}/matches`;

  try {
    // Compile template using React Email render function
    const htmlContent = await render(
      <PredictionReminderEmail
        displayName={displayName}
        upcomingMatches={upcomingMatches}
        actionUrl={actionUrl}
        unsubscribeUrl={unsubscribeUrl}
      />
    );

    return sendEmail({
      to: email,
      subject: `⚽ Reminder: ${upcomingMatches.length} Upcoming World Cup Predictions Pending!`,
      htmlContent,
    });
  } catch (err: any) {
    console.error("Failed to render React Email template:", err);
    return { success: false, error: err.message || "Render failed" };
  }
}
