import mongoose, { Schema, Model } from "mongoose";

export interface IUser  {
  email: string;
  password: string; // In production, store hashed passwords!
}

const UserSchema: Schema<IUser> = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export interface IUserInfo extends Omit<IUser, 'password'> {
  id: string;
}