import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { login } from "../store/authSlice";

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, error } = useAppSelector((state) => state.auth);
  const [form, setForm] = useState({ username: "", password: "" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await dispatch(login(form));
    if (result.meta.requestStatus === "fulfilled") {
      navigate("/");
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Login"
      footer={
        <p>
          No account?{" "}
          <Link to="/register" className="font-semibold text-emerald-800">
            Register
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={form.username}
          onChange={(event) => setForm({ ...form, username: event.target.value })}
          placeholder="Username"
          className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none ring-0 placeholder:text-stone-400 focus:border-emerald-700"
        />
        <input
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          placeholder="Password"
          className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none ring-0 placeholder:text-stone-400 focus:border-emerald-700"
        />
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-2xl bg-emerald-800 px-4 py-3 font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "loading" ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
