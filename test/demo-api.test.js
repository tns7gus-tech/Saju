import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './helpers.js';
test('login required and linked providers share account and profile',()=>{
 const {window,chart}=setup(),a=window.SaiDemoAPI,c=chart();assert.throws(()=>a.daily(c),/로그인/);assert.throws(()=>a.consultation(c,'연애가 궁금합니다.'),/로그인/);a.login('kakao');a.link('google');a.saveProfile(c.input);const r=a.daily(c);a.logout();a.login('google');assert.equal(a.session().id,'demo-kakao');assert.deepEqual(a.session().profile,c.input);assert.equal(a.daily(c).title,r.title);a.login('naver');assert.equal(a.session().orders.length,0);assert.throws(()=>a.link('google'),/다른 테스트 계정/);
});
test('daily result stable per account/day and consultation resets at KST midnight',()=>{
 const {window,chart,clock}=setup(),a=window.SaiDemoAPI,c=chart();a.login('kakao');clock('2026-09-28T14:59:59Z');a.daily(c);assert.equal(a.daily(chart('2001-03-21')).signature,a.inputKey(c));a.consultation(c,'연애에서 표현하는 방법이 궁금합니다.');assert.throws(()=>a.consultation(c,'연애에서 표현하는 방법이 궁금합니다.'),/오늘의 무료 상담/);clock('2026-09-28T15:00:00Z');assert.equal(a.today(),'2026-09-29');assert.equal(a.daily(c).day,'2026-09-29');assert.ok(a.consultation(c,'이직할 때 고민이 있습니다.').consumes);
});
test('unrecognized question and invalid input do not consume consultation',()=>{const {window,chart}=setup(),a=window.SaiDemoAPI;a.login('naver');assert.equal(a.consultation(chart(),'오늘 저녁 메뉴가 궁금해요?').consumes,false);assert.equal(Object.keys(a.session().consults).length,0);assert.throws(()=>a.consultation(chart(),'돈'));assert.equal(Object.keys(a.session().consults).length,0);});
test('purchase idempotent per parameters, failure never grants access',()=>{
 const {window,chart}=setup(),a=window.SaiDemoAPI,c=chart(),r={title:'테스트',paragraphs:['보고서']};a.login('kakao');assert.throws(()=>a.purchase('annual',c,{year:'2026'},r,'failure'),/실패/);assert.equal(a.session().orders.length,0);const o=a.purchase('annual',c,{year:'2026'},r);assert.equal(a.purchase('annual',c,{year:'2026'},r).id,o.id);assert.equal(a.session().orders.length,1);a.purchase('annual',c,{year:'2027'},r);assert.equal(a.session().orders.length,2);assert.equal(o.charged,0);a.logout();assert.throws(()=>a.purchase('saju',c,{},r),/로그인/);
});
test('storage failure reported without success, reset recovers corruption',()=>{const {window,chart,storage}=setup(),a=window.SaiDemoAPI;storage.setItem('sai-demo-v2','broken');assert.throws(()=>a.session(),/손상/);a.reset();a.login('google');const before=a.session();storage.setItem=()=>{throw Error('quota');};assert.throws(()=>a.daily(chart()),/저장/);assert.deepEqual(a.session(),before);});
