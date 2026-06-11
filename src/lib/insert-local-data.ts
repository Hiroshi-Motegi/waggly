/**
 * Insert local data into Supabase under a given user ID.
 * Shared by resolve-conflict and upload-local-data APIs.
 */
export async function insertLocalData(supabase: any, userId: string, localData: any) {
  const { clubs = [], accessories = [], practiceSessions = [] } = localData;

  for (const club of clubs) {
    const { club_memos = [], club_images = [], maintenances = [], ...clubData } = club;
    const { error: clubErr } = await supabase.from("clubs").insert({ ...clubData, user_id: userId });
    if (clubErr) throw new Error(`Failed to insert club: ${clubErr.message}`);
    for (const memo of club_memos) {
      const { error } = await supabase.from("club_memos").insert(memo);
      if (error) throw new Error(`Failed to insert club_memo: ${error.message}`);
    }
    for (const image of club_images) {
      const { error } = await supabase.from("club_images").insert(image);
      if (error) throw new Error(`Failed to insert club_image: ${error.message}`);
    }
    for (const maintenance of maintenances) {
      const { error } = await supabase.from("maintenances").insert(maintenance);
      if (error) throw new Error(`Failed to insert maintenance: ${error.message}`);
    }
  }

  for (const accessory of accessories) {
    const { error } = await supabase.from("accessories").insert({ ...accessory, user_id: userId });
    if (error) throw new Error(`Failed to insert accessory: ${error.message}`);
  }

  for (const session of practiceSessions) {
    const { practice_clubs = [], ...sessionData } = session;
    const { error: sessionErr } = await supabase.from("practice_sessions").insert({ ...sessionData, user_id: userId });
    if (sessionErr) throw new Error(`Failed to insert practice_session: ${sessionErr.message}`);
    for (const pc of practice_clubs) {
      const { error } = await supabase.from("practice_clubs").insert(pc);
      if (error) throw new Error(`Failed to insert practice_club: ${error.message}`);
    }
  }
}
