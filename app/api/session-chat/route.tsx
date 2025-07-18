import { db } from "@/config/db";
import { sessionChatTable } from "@/config/schema";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { notes, selectedDoctor } = await req.json();
  const user = await currentUser();

  try {
    const sessionId = uuidv4();
    const result = await db
      .insert(sessionChatTable)
      .values({
        sessionId: sessionId,
        createdBy: user?.primaryEmailAddress?.emailAddress,
        notes: notes,
        selectedDoctor: selectedDoctor,
        createdOn: new Date().toString(),
      }) //@ts-ignore
      .returning({ sessionChatTable });

    return NextResponse.json(result[0]?.sessionChatTable);
  } catch (e) {
    return NextResponse.json(e);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const user = await currentUser();

  if (sessionId == "all") {
    const result = await db
      .select()
      .from(sessionChatTable)
      .where(
        //@ts-ignore
        eq(sessionChatTable.createdBy, user?.primaryEmailAddress?.emailAddress)
      )
      .orderBy(desc(sessionChatTable.id));

    return NextResponse.json(result);
  } else {
    const result = await db
      .select()
      .from(sessionChatTable)
      //@ts-ignore
      .where(eq(sessionChatTable.sessionId, sessionId));

    return NextResponse.json(result[0]);
  }
}
