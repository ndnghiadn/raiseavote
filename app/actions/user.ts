"use server";

import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongoose";
import { User, IUser } from "@/models/User";
import { UserRegisterInput } from "@/lib/validations/user";

interface JWTPayload {
  email: string;
}

const setTokenCookies = async (payload: JWTPayload) => {
  const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!);

  const cookieStore = await cookies();
  cookieStore.set("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    maxAge: 15 * 60 * 60 * 24, // 15 days
    path: "/",
  });
};

export async function registerUser({ email, password }: UserRegisterInput) {
  await dbConnect();

  const hashedPassword = await bcrypt.hash(password, 10);

  const existing = await User.findOne({ email });
  if (existing) return { error: "User already exists" };

  const user = await User.create({ email, password: hashedPassword });

  const payload: JWTPayload = { email: user.email };

  await setTokenCookies(payload);

  return { email: user.email, password: "" };
}

export async function loginUser({ email, password }: UserRegisterInput) {
  await dbConnect();

  const user = await User.findOne({ email });
  if (!user) return { error: "Invalid credentials" };

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return { error: "Invalid credentials" };

  const payload: JWTPayload = { email: user.email };

  await setTokenCookies(payload);

  return { email: user.email, password: "" };
}

export async function getUser(): Promise<IUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    if (accessToken) {
      const decoded = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET!
      ) as JWTPayload;
      return { email: decoded.email, password: "" };
    }
    return null;
  } catch (err) {
    console.log("err", err);
  }
  return null;
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("accessToken");
}
