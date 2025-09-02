"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userRegisterSchema, UserRegisterInput } from "@/lib/validations/user";
import { useRouter } from "next/navigation";
import { registerUser } from "@/app/actions/user";

const RegisterPage = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserRegisterInput>({
    resolver: zodResolver(userRegisterSchema),
  });

  const [message, setMessage] = React.useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (data: UserRegisterInput) => {
    const result = await registerUser(data);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    router.push("/profile");
    reset();
  };

  return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="max-w-sm w-full mx-auto mt-10 p-4 border rounded">
        <h2 className="text-lg font-bold mb-4">Register</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            className="border p-2 rounded"
            {...register("email")}
          />
          {errors.email && (
            <span className="text-red-600 text-xs">{errors.email.message}</span>
          )}
          <input
            type="password"
            placeholder="Password"
            className="border p-2 rounded"
            {...register("password")}
          />
          {errors.password && (
            <span className="text-red-600 text-xs">
              {errors.password.message}
            </span>
          )}
          <button
            type="submit"
            className="bg-blue-600 text-white rounded p-2 hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Registering..." : "Register"}
          </button>
        </form>
        {message && <div className="mt-4 text-sm">{message}</div>}
      </div>
    </div>
  );
};

export default RegisterPage;
