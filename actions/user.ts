"use server";

import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongoose";
import { User, IUser, IUserInfo } from "@/models/User";
import { UserRegisterInput } from "@/lib/validations/user";
import { redirect } from "next/navigation";

interface JWTPayload {
  id: string;
}

export const setTokenCookies = async (payload: JWTPayload): Promise<void> => {
  const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!);
  const cookieStore = await cookies();
  cookieStore.set("accessToken", accessToken, {
    maxAge: 7 * 60 * 60 * 24, // 7-days valid from last access
    domain: "",
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
    partitioned: true,
    priority: "high",
  });
};

export async function registerUser({ email, password }: UserRegisterInput) {
  await dbConnect();

  const hashedPassword = await bcrypt.hash(password, 10);

  const existing = await User.findOne({ email });
  if (existing) return { error: "User already exists" };

  const user = await User.create({ email, password: hashedPassword });

  const payload: JWTPayload = { id: user.id };

  await setTokenCookies(payload);

  return { email: user.email, password: "" };
}

export async function loginUser({ email, password }: UserRegisterInput) {
  await dbConnect();

  const user = await User.findOne({ email });
  if (!user) return { error: "Invalid credentials" };

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return { error: "Invalid credentials" };

  const payload: JWTPayload = { id: user.id };

  await setTokenCookies(payload);

  return { email: user.email, password: "" };
}

export async function getUser(): Promise<IUserInfo | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    if (accessToken) {
      const decoded = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET!
      ) as JWTPayload;
      const user = await User.findOne({ _id: decoded.id });
      if (!user) return null;
      return { email: user.email, id: user.id };
    }
    return null;
  } catch (err) {
    console.log("err", err);
  }
  return null;
}

export const getUserInfo = async (): Promise<IUserInfo> => {
  const result = await getUser();

  if (!result) {
    redirect("/login");
  }

  return result;
};

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.set("accessToken", "", {
    maxAge: 0,
    domain: "",
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
    partitioned: true,
    priority: "high"
  });
  redirect("/login");
}
