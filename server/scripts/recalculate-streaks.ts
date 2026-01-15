import { getCollection } from "../config/mongo";

async function recalc() {
  const execute = String(process.env.EXECUTE || "").toLowerCase() === "true";

  console.log("Recalculate streaks script");
  console.log(`Execute mode: ${execute ? "ON" : "OFF (dry-run)"}`);

  const usersCol = await getCollection("users");
  const submissionsCol = await getCollection("submissions");

  const users = await usersCol.find({}).toArray();
  console.log(`Found ${users.length} users`);

  for (const user of users) {
    try {
      const username = user.username;
      if (!username) continue;

      // fetch accepted submissions for this user
      const subs = await submissionsCol
        .find({ user_id: username, status: "accepted" })
        .sort({ submitted_at: -1 })
        .toArray();

      if (!subs || subs.length === 0) {
        if (user.streak_days && user.streak_days !== 0) {
          console.log(
            `User ${username}: no accepted submissions but streak_days=${user.streak_days}; will set to 0`,
          );
          if (execute) {
            await usersCol.updateOne(
              { _id: user._id },
              { $set: { streak_days: 0 } },
            );
          }
        }
        continue;
      }

      // build sorted list of unique UTC dates (YYYY-MM-DD) from submissions
      const dateSet = new Set<string>();
      for (const s of subs) {
        const d = s.submitted_at ? new Date(s.submitted_at) : null;
        if (!d) continue;
        dateSet.add(d.toISOString().slice(0, 10));
      }

      const dates = Array.from(dateSet).sort((a, b) => (a < b ? 1 : -1)); // desc
      if (dates.length === 0) continue;

      // compute streak: consecutive days ending at latest date
      let streak = 1;
      const latestDateStr = dates[0];
      let prev = new Date(latestDateStr + "T00:00:00.000Z");

      for (let i = 1; i < dates.length; i++) {
        const cur = new Date(dates[i] + "T00:00:00.000Z");
        // difference in days between prev and cur
        const diffMs = prev.getTime() - cur.getTime();
        const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
        if (diffDays === 1) {
          streak += 1;
          prev = cur;
        } else {
          break;
        }
      }

      // latest submission timestamp (most recent accepted)
      const latestSubmission = subs[0];
      const latestSubmittedAt = latestSubmission.submitted_at
        ? new Date(latestSubmission.submitted_at)
        : new Date();

      const prevStreak = user.streak_days || 0;

      console.log(
        `User ${username}: computed streak=${streak} (previous=${prevStreak}), latest accepted=${latestSubmittedAt.toISOString()}`,
      );

      if (execute) {
        const update: any = {
          $set: {
            streak_days: streak,
            last_activity: latestSubmittedAt,
            updated_at: new Date(),
          },
        };
        await usersCol.updateOne({ _id: user._id }, update);
      }
    } catch (e) {
      console.error("Error processing user", user.username, e);
    }
  }

  console.log("Recalculation complete");
}

recalc()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
