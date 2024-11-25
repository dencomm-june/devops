import { startBusListener } from '../../utils/busListener';

export default async function handler(req, res) {
  await startBusListener();
  res.status(200).send('버스 좌석 정보 수집을 시작했습니다.');
}
