"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
apiKey: process.env.GEMINI_API_KEY,
});

// ================= AI INSIGHTS =================

export const generateAIInsights = async (industry) => {
try {
const prompt = `
Analyze the current state of the ${industry} industry and return ONLY JSON in this format:

{
"salaryRanges": [
{ "role": "string", "min": number, "max": number, "median": number, "location": "string" }
],
"growthRate": number,
"demandLevel": "High" | "Medium" | "Low",
"topSkills": ["skill1", "skill2"],
"marketOutlook": "Positive" | "Neutral" | "Negative",
"keyTrends": ["trend1", "trend2"],
"recommendedSkills": ["skill1", "skill2"]
}

Rules:

* Return ONLY JSON
* No markdown
* No explanation
* Minimum 5 roles and skills
  `;

  const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: prompt,
  });

  const text = response.text;

  const cleanedText = text
  .replace(/`json/g, "")
      .replace(/`/g, "")
  .trim();

  return JSON.parse(cleanedText);

  } catch (error) {
  console.error("AI generation failed:", error);

  return {
  salaryRanges: [],
  growthRate: 0,
  demandLevel: "Medium",
  topSkills: [],
  marketOutlook: "Neutral",
  keyTrends: [],
  recommendedSkills: [],
  };
  }
  };

// ================= INDUSTRY INSIGHTS =================

export async function getIndustryInsights() {
const { userId } = await auth();

if (!userId) throw new Error("Unauthorized");

const user = await db.user.findUnique({
where: { clerkUserId: userId },
include: {
industryInsight: true,
},
});

if (!user) throw new Error("User not found");

if (!user.industryInsight) {
const insights = await generateAIInsights(user.industry);

```
const industryInsight = await db.industryInsight.create({
  data: {
    industry: user.industry,
    ...insights,
    nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
});

return industryInsight;
```

}

return user.industryInsight;
}

// ================= UPDATE USER =================

export async function updateUser(data) {

const { userId } = await auth();

if (!userId) throw new Error("Unauthorized");

const user = await db.user.findUnique({
where: { clerkUserId: userId },
});

if (!user) throw new Error("User not found");

try {

```
// 1️⃣ Check if insights already exist
let industryInsight = await db.industryInsight.findUnique({
  where: {
    industry: data.industry,
  },
});

// 2️⃣ Generate AI insights OUTSIDE transaction
if (!industryInsight) {

  const insights = await generateAIInsights(data.industry);

  industryInsight = await db.industryInsight.create({
    data: {
      industry: data.industry,
      ...insights,
      nextUpdate: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ),
    },
  });
}

// 3️⃣ Update user profile
const updatedUser = await db.user.update({
  where: {
    id: user.id,
  },
  data: {
    industry: data.industry,
    experience: data.experience,
    bio: data.bio,
    skills: data.skills,
  },
});

revalidatePath("/");

return updatedUser;
```

} catch (error) {

```
console.error("Error updating user:", error);

throw new Error("Failed to update profile");
```

}
}

// ================= ONBOARDING STATUS =================

export async function getUserOnboardingStatus() {

const { userId } = await auth();

if (!userId) throw new Error("Unauthorized");

try {

```
const user = await db.user.findUnique({
  where: {
    clerkUserId: userId,
  },
  select: {
    industry: true,
  },
});

return {
  isOnboarded: !!user?.industry,
};
```

} catch (error) {

```
console.error("Error checking onboarding status:", error);

throw new Error("Failed to check onboarding status");
```

}
}
