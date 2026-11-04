// 사업자등록번호 체크섬 (money-pinda calc.js와 같은 규칙)
export function validBizNo(no) {
  const s = String(no ?? '').replace(/\D/g, '');
  if (s.length !== 10) return false;
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(s[i]) * w[i];
  sum += Math.floor((Number(s[8]) * 5) / 10);
  return (10 - (sum % 10)) % 10 === Number(s[9]);
}
