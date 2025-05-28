import { NextRequest, NextResponse } from "next/server";
import { authorService } from "@/db/services";

export async function GET() {
  try {
    const users = await authorService.getAllAuthors();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, name, clerkUserId } = await request.json();
    
    if (!email || !name || !clerkUserId) {
      return NextResponse.json(
        { error: "Email, name, and clerkUserId are required" },
        { status: 400 }
      );
    }

    const user = await authorService.createAuthor({ 
      email, 
      displayName: name, 
      clerkUserId 
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
