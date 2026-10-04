export const providers={
  kakao:{authorize:'https://kauth.kakao.com/oauth/authorize',token:'https://kauth.kakao.com/oauth/token',profile:'https://kapi.kakao.com/v2/user/me'},
  naver:{authorize:'https://nid.naver.com/oauth2.0/authorize',token:'https://nid.naver.com/oauth2.0/token',profile:'https://openapi.naver.com/v1/nid/me'}
};
export function configuration(provider,env){
  if(!providers[provider])return null;
  const prefix=provider.toUpperCase();
  const id=env[`${prefix}_CLIENT_ID`],secret=env[`${prefix}_CLIENT_SECRET`];
  return id&&secret?{...providers[provider],id,secret}:null;
}
export function authorization(config,redirect,state){
  const url=new URL(config.authorize);
  url.search=new URLSearchParams({response_type:'code',client_id:config.id,redirect_uri:redirect,state}).toString();
  return url.href;
}
export async function identity(config,provider,redirect,code,state,request=fetch){
  const res=await request(config.token,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:config.id,client_secret:config.secret,redirect_uri:redirect,code,state}),signal:AbortSignal.timeout(15000)});
  const tokens=await res.json();
  if(!res.ok||tokens.error||!tokens.access_token)throw Error('소셜 로그인 토큰 발급 실패');
  const profile=await request(config.profile,{headers:{Authorization:`Bearer ${tokens.access_token}`},signal:AbortSignal.timeout(15000)});
  const data=await profile.json();
  const user=provider==='kakao'?data:data.response;
  if(!profile.ok||(provider==='naver'&&data.resultcode!=='00')||!user?.id)throw Error('소셜 계정 확인 실패');
  return {subject:String(user.id),name:String(provider==='kakao'?user.properties?.nickname||'사이 여행자':user.nickname||user.name||'사이 여행자').slice(0,80)};
}
