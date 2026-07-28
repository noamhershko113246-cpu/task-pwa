"use client"; // <-- חובה! השורה הזו חייבת להיות השורה הראשונה בקובץ, בלי שום רווח או קוד מעליה!

import React from "react";
import { useToast } from "@/components/ui/use-toast"; // או נתיב הייבוא המדויק אצלך
// שאר הייבואים שלך (למשל סופאבייס, כפתורים וכו')...

export default function LoginPage() {
  const { toast } = useToast(); // השימוש בתוך הקומפוננטה

  // שאר הלוגיקה וה-JSX של הדף שלך...
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1>התחברות</h1>
      {/* הקוד המקור שלך כאן */}
    </div>
  );
}