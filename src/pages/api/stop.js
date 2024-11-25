import { stopBusListener } from '../../utils/busListener';

export default async function handler(req, res) {
  await stopBusListener();
  res.status(200).send('버스 좌석 정보 수집을 중지했습니다.');
}
