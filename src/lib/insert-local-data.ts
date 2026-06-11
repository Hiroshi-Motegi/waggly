/**
 * Insert local data into Supabase under a given user ID.
 * Shared by resolve-conflict and upload-local-data APIs.
 */
export async function insertLocalData(supabase: any, userId: string, localData: any) {
  const { clubs = [], accessories = [], practiceSessions = [] } = localData;

  for (const club of clubs) {
    const { club_memos = [], club_images = [], maintenances = [], ...clubData } = club;
    await supabase.from("clubs").insert({ ...clubData, user_id: userId });
    for (const memo of club_memos) {
      await supabase.from("club_memos").insert(memo);
    }
    for (const image of club_images) {
      await supabase.from("club_images").insert(image);
    }
    for (const maintenance of maintenances) {
      await supabase.from("maintenances").insert(maintenance);
    }
  }

  for (const accessory of accessories) {
    await supabase.from("accessories").insert({ ...accessory, user_id: userId });
  }

  for (const session of practiceSessions) {
    const { practice_clubs = [], ...sessionData } = session;
    await supabase.from("practice_sessions").insert({ ...sessionData, user_id: userId });
    for (const pc of practice_clubs) {
      await supabase.from("practice_clubs").insert(pc);
    }
  }
}
