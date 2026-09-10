// Vercel server-only endpoint. Never put this token in dist/ or client JavaScript.
let cached, pending;
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
async function request(path, token, init = {}) {
  const response = await fetch(`https://open.tiktokapis.com/v2/${path}`, {
    ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000)
  });
  const body = await response.json();
  if (!response.ok || body.error?.code !== 'ok') {
    const error = new Error('TikTok request failed');
    error.status = response.status;
    error.code = body.error?.code;
    throw error;
  }
  return body.data;
}
async function load(token) {
  const [profile, videos] = await Promise.allSettled([
    request('user/info/?fields=display_name,follower_count,likes_count,video_count', token),
    request('video/list/?fields=id,title,video_description,create_time,like_count,comment_count,view_count,share_count,share_url', token, {method:'POST',body:JSON.stringify({max_count:1})})
  ]);
  if (profile.status !== 'fulfilled') throw profile.reason;
  const user = profile.value?.user;
  if (!user || ['follower_count','likes_count','video_count'].some(key => count(user[key]) === null)) throw new Error('Missing stats scope or invalid response');
  const raw = videos.status === 'fulfilled' ? videos.value?.videos?.[0] : null;
  const video = raw && /^\d{1,30}$/.test(raw.id) ? {
    id:raw.id, watchUrl:raw.share_url || null, caption:String(raw.video_description || raw.title || ''),
    postedAt:count(raw.create_time), likes:count(raw.like_count), comments:count(raw.comment_count),
    views:count(raw.view_count), shares:count(raw.share_count)
  } : null;
  return {status:'connected',name:String(user.display_name || 'TikTok'),followers:user.follower_count,
    likes:user.likes_count,videos:user.video_count,video,
    videoStatus:videos.status === 'rejected' ? 'unavailable' : video ? 'available' : 'empty',updatedAt:new Date().toISOString()};
}
module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'GET'){res.setHeader('Allow','GET');return res.status(405).json({status:'method_not_allowed'});}
  const token=process.env.TIKTOK_ACCESS_TOKEN;
  if(!token)return res.status(503).json({status:'not_connected'});
  // Cache counts for 60s and coalesce concurrent requests in this instance.
  if(cached?.token===token && Date.now()-cached.time<60000)return res.status(200).json(cached.data);
  try {
    if(!pending || pending.token!==token){const job={token,promise:load(token)};pending=job;job.promise.finally(()=>{if(pending===job)pending=null;}).catch(()=>{});}
    const data=await pending.promise;cached={token,time:Date.now(),data};
    return res.status(200).json(data);
  }catch(error){
    if(cached?.token===token && Date.now()-cached.time<900000)return res.status(200).json({...cached.data,stale:true});
    const auth=error.status===401 || ['access_token_invalid','access_token_expired'].includes(error.code);
    return res.status(503).json({status:auth?'reconnect_required':'unavailable'});
  }
};
