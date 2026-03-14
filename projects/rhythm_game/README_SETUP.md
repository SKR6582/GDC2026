# Rhythm Game: Setup Guide (Windows & macOS)

이 가이드는 리듬 게임 프로젝트를 깡통 컴퓨터(초기 상태)에서 성공적으로 실행하기 위한 단계별 안내서입니다. 이 프로젝트는 `web-audio-api`와 같은 네이티브 의존성을 사용하므로, 각 OS별 빌드 도구 설치가 필수적입니다.

---

## 1. 공통 준비 사항: Node.js 설치

가장 먼저 Node.js가 필요합니다. **Node.js 18.x 이상** 버전을 권장합니다.

- **설치 방법:** [Node.js 공식 홈페이지](https://nodejs.org/)에서 **LTS 버전**을 다운로드하여 설치하세요.
- **설치 확인:** 터미널(또는 CMD)에서 다음 명령어를 입력했을 때 버전이 나오면 성공입니다.
  ```bash
  node -v
  npm -v
  ```

---

## 2. macOS에서 셋업하기

macOS는 네이티브 모듈 빌드를 위해 **Xcode 커맨드 라인 도구**가 필요합니다.

1.  **빌드 도구 설치:** 터미널을 열고 아래 명령어를 입력하세요.
    ```bash
    xcode-select --install
    ```
    (이미 설치되어 있다면 오류가 뜨는데, 무시하셔도 됩니다.)

2.  **프로젝트 폴더로 이동:** 터미널에서 `cd` 명령어를 이용해 프로젝트 경로로 이동합니다.
    ```bash
    cd /Users/seungjun/GDC2026/projects/rhythm_game
    ```

3.  **패키지 설치:**
    ```bash
    npm install
    ```

---

## 3. Windows에서 셋업하기

Windows는 C++ 빌드 도구와 Python이 필요합니다.

1.  **Visual Studio 빌드 도구 설치:**
    - [Visual Studio 다운로드 페이지](https://visualstudio.microsoft.com/ko/downloads/)에서 "Visual Studio 2022용 빌드 도구"를 받거나, Visual Studio Community를 설치합니다.
    - 설치 관리자에서 **"C++를 사용한 데스크톱 개발"** 워크로드를 반드시 체크하고 설치하세요. (이 과정이 없으면 `npm install` 시 `node-gyp` 에러가 발생합니다.)

2.  **프로젝트 폴더로 이동:** 명령 프롬프트(CMD) 또는 PowerShell을 열고 프로젝트 경로로 이동합니다.
    ```cmd
    cd C:\path\to\rhythm_game
    ```

3.  **패키지 설치:**
    ```cmd
    npm install
    ```

---

## 4. 게임 실행 및 접속

1.  **서버 실행:** 터미널/CMD에서 아래 명령어를 입력합니다.
    ```bash
    npm start
    ```
2.  **브라우저 접속:** 크롬(Chrome) 또는 엣지(Edge) 브라우저를 열고 아래 주소로 이동합니다.
    - [http://localhost:3000](http://localhost:3000)

---

## 5. 추가 기능: 비트맵 자동 생성 (고급)

음악 파일(`public/song.mp3`)을 기반으로 비트맵을 자동으로 생성하고 싶을 때 사용합니다.

1.  `public` 폴더 안에 분석하고 싶은 `song.mp3` 파일을 넣습니다.
2.  터미널에서 아래 명령을 실행합니다.
    ```bash
    node generate_beatmap.js
    ```
3.  성공하면 `public/beatmap.json` 파일이 갱신됩니다.

---

## 6. 트러블슈팅 (문제가 발생하면?)

- **`node-gyp` 관련 에러:** 대부분 빌드 도구(Xcode 또는 VS Build Tools)가 없어서 발생합니다. 위 2번 또는 3번의 설치 과정을 다시 확인하세요.
- **포트 충돌:** 만약 3000번 포트가 이미 사용 중이라면, `server.js` 파일 하단의 `const PORT = 3000;` 부분을 다른 숫자(예: 8080)로 바꾸고 다시 시도하세요.
- **오디오 재생 안 됨:** 브라우저의 보안 정책상 화면을 한 번 클릭해야 소리가 나기 시작합니다.
