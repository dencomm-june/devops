const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const axios = require('axios');
const { getIsRunning, setIsRunning } = require('./globalState'); 

// let isRunning = false;
let browser;
let page;

const slackWebhookUrl = 'https://hooks.slack.com/services/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'; // 실제 URL로 교체하세요

// 버스 좌석 정보를 수집하고 Slack으로 전송하는 함수
async function startBusListener() {
    try {
      // 이미 실행 중인 경우 종료
      if (getIsRunning()) {
        console.log('이미 버스 좌석 정보를 수집 중입니다.');
        return;
      }
  
      setIsRunning(true);
  
      // 브라우저 실행
      // browser = await puppeteer.launch({
      //     // headless 모드로 실행 (기본값이 true이므로 옵션을 생략해도 됩니다)
      //     headless: true,
      //     args: [
      //       '--no-sandbox',
      //       '--disable-setuid-sandbox',
      //       '--disable-dev-shm-usage',
      //       '--disable-accelerated-2d-canvas',
      //       '--no-first-run',
      //       '--no-zygote',
      //       '--single-process',
      //       '--disable-gpu',
      //     ],
      // });
      browser = await puppeteer.launch({
        // args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
        args: chromium.args,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
  
      // 새로운 페이지 열기
      page = await browser.newPage();
  
      // 페이지 이동
      await page.goto('https://www.kobus.co.kr/mrs/rotinf.do', { waitUntil: 'networkidle0' });
  
      // '#readDeprInfoList' 요소가 로드될 때까지 대기
      await page.waitForSelector('#readDeprInfoList');
  
      // '#readDeprInfoList' 클릭하여 팝업 열기
      await page.click('#readDeprInfoList');
  
      // 팝업이 로드될 때까지 대기
      await page.waitForSelector('.pop_place.full.remodal-is-opened');
  
      // 1. '서울경부' 버튼 클릭 (주요출발지 섹션)
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('#imptDepr .tags button');
        for (let button of buttons) {
          if (button.textContent.trim() === '서울경부') {
            button.click();
            break;
          }
        }
      });
  
      // 1초 대기하여 동작 시간 확보
      await new Promise(resolve => setTimeout(resolve, 1000));
  
      // 2. '용인유림' 버튼 클릭 (터미널 목록에서)
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('#tableTrmList button');
        for (let button of buttons) {
          if (button.textContent.trim() === '용인유림') {
            button.click();
            break;
          }
        }
      });
  
      // 선택완료 버튼 클릭하여 선택 확정
      await page.click('#cfmBtn');
  
      // 1초 대기하여 동작 시간 확보
      await new Promise(resolve => setTimeout(resolve, 1000));
  
      // alert 창이 뜨기 전에 이벤트 리스너 설정
      page.on('dialog', async dialog => {
        console.log('Alert 메시지:', dialog.message());
        await dialog.accept(); // alert 창 닫기
      });
  
      // '조회하기' 버튼 클릭
      await page.click('.btn_confirm.noHover.btn_pop_focus');
  
      // 페이지 이동 또는 업데이트 대기
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
  
      // 버스 시간표가 로드될 때까지 대기
      await page.waitForSelector('.bustime_wrap');
  
      // 반복 실행을 위한 함수 정의
      async function fetchBusInfo() {
        if (!getIsRunning()) {
          return;
        }
  
        try {
          // alert 창이 뜰 수 있으므로 이벤트 리스너 설정
          page.on('dialog', async dialog => {
            console.log('Alert 메시지:', dialog.message());
            await dialog.accept();
          });
  
          // 새로고침 버튼 클릭과 페이지 네비게이션 대기
          await Promise.all([
            page.click('#reloadBtn'),
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
          ]);
  
          // 이벤트 리스너 제거 (중복 방지)
          page.removeAllListeners('dialog');
  
          // 버스 시간표가 로드될 때까지 대기
          await page.waitForSelector('.bustime_wrap');
  
          // 18:20 이후 출발하는 버스의 잔여석 정보 추출
          const busInfo = await page.evaluate(() => {
            const busRows = document.querySelectorAll('.bus_time p');
            const results = [];
  
            busRows.forEach(row => {
              const timeElement = row.querySelector('.start_time');
              const remainElement = row.querySelector('.remain');
              if (timeElement && remainElement) {
                const timeText = timeElement.textContent.trim();
                const remainText = remainElement.textContent.trim();
  
                // 시간 문자열을 분으로 변환하여 비교
                const timeParts = timeText.split(':');
                const hours = parseInt(timeParts[0], 10);
                const minutes = parseInt(timeParts[1], 10);
                const totalMinutes = hours * 60 + minutes;
  
                // 18:20 이후의 버스만 선택 (18시 20분 = 1100분)              
                // 18:20 이후의 버스만 선택 (19시 10분 = 1150분)
                // 18:20 이후의 버스만 선택 (20시 00분 = 1190분)
                // 18:20 이후의 버스만 선택 (20시 00분 = 1190분)
                // if (totalMinutes == 1100 || totalMinutes == 1150 || totalMinutes == 1200 || totalMinutes == 1250) {
                if (totalMinutes == 1150) {
                    // 잔여석이 0석이 아닌경우에만
                    if (remainText != '0 석') {
                        results.push({
                            time: timeText,
                            remainingSeats: remainText
                        });
                    }
                  
                } else {
                  console.log('잔여석이 없습니다')
                }
              }
            });
  
            return results;
          });
  
          // 결과 출력
          // if (busInfo) {
          //     console.log(`출발 시간: ${info.time}, 잔여석: ${info.remainingSeats}`);
          // }
          // console.log('18:20 이후 버스 잔여석 정보:');
          // busInfo.forEach(info => {
          //   console.log(`출발 시간: ${info.time}, 잔여석: ${info.remainingSeats}`);
          // });
  
          // Slack으로 메시지 전송
          if (busInfo.length > 0) {
            for(const info of busInfo) {
                console.log(`잔여석 발견! 출발 시간: ${info.time}, 잔여석: ${info.remainingSeats}`)
                const message = busInfo.map(info => `출발 시간: ${info.time}, 잔여석: ${info.remainingSeats}`).join('\n');
    
                await axios.post(slackWebhookUrl, {
                text: `버스 잔여석 정보:\n${message}`
                });
                console.log('Slack으로 메시지를 전송했습니다.');
                stopBusListener();
            }
          } else {
            console.log('전송할 버스 정보가 없습니다.');
          }
  
          // 3~5초 대기 후 재귀 호출
          const delay = Math.floor(Math.random() * 2000) + 3000;
          setTimeout(fetchBusInfo, delay);
  
        } catch (error) {
          console.error('버스 정보를 가져오는 중 에러 발생:', error);
          // 에러 발생 시 일정 시간 대기 후 재시도
          setTimeout(fetchBusInfo, 5000);
        }
      }
  
      // 초기 실행
      fetchBusInfo();
  
    } catch (error) {
      console.error('버스 좌석 정보 수집을 시작하는 도중 에러 발생:', error);
      setIsRunning(false);
    }
}

// 버스 좌석 정보 수집 중지 함수
async function stopBusListener() {
    try {
        if (!getIsRunning()) {
            console.log('버스 좌석 정보 수집이 실행 중이 아닙니다.');
            return;
        }

        setIsRunning(false); // 글로벌 상태 업데이트

        if (page) {
            await page.close();
            page = null;
        }

        if (browser) {
            await browser.close();
            browser = null;
        }

        console.log('버스 좌석 정보 수집을 중지했습니다.');
    } catch (error) {
        console.error('버스 좌석 정보 수집을 중지하는 도중 에러 발생:', error);
    }
}

module.exports = { startBusListener, stopBusListener };
