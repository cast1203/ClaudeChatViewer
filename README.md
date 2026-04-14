# Claude Chat Viewer

<p align="center">
  <img src="assets/icon.png" alt="Claude Chat Viewer" width="128" height="128">
</p>

<p align="center">
  <strong>Claude 대화 내역을 편리하게 관리하는 데스크톱 앱</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows-blue" alt="Platform">
  <img src="https://img.shields.io/badge/Electron-28.0-47848F?logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

---

## 📖 소개

Claude Chat Viewer는 [Claude](https://claude.ai)에서 내보낸 대화 기록을 편리하게 열람하고 관리할 수 있는 Electron 기반 데스크톱 애플리케이션입니다.

대화를 카테고리와 태그로 분류하고, 로컬 AI(Ollama)를 활용한 자동 분류 기능으로 수백 개의 대화도 손쉽게 정리할 수 있습니다.

## ✨ 주요 기능

### 📁 다양한 파일 형식 지원
- ZIP 파일 (Claude 내보내기 기본 형식)
- JSON 파일
- 폴더 (여러 JSON 파일 일괄 로드)

### 🏷️ 카테고리 & 태그 관리
- 대화별 카테고리 지정 (단일)
- 대화별 태그 지정 (복수)
- 커스텀 색상 설정
- 카테고리/태그별 필터링

### 🤖 AI 자동 분류 (Ollama 연동)
- 로컬 AI를 활용한 대화 자동 분류
- 단건 / 순차 / 일괄 처리 모드 지원
- 기존 카테고리에서 자동 선택, 새 태그 자동 생성

### 🔍 검색 & 필터
- 전체 텍스트 검색 (제목 + 내용)
- 검색어 하이라이트
- 정렬: 최신순 / 오래된순 / 이름순
- 메시지 필터: 전체 / 내 메시지 / Claude 메시지

### 💬 메신저 스타일 UI
- Human 메시지 → 오른쪽 (보라색 말풍선)
- Claude 메시지 → 왼쪽 (회색 말풍선)
- 다크 테마 기본 적용

### 🖥️ 편의 기능
- 커스텀 타이틀바
- 마지막 열었던 파일 자동 로드
- 오른쪽 클릭 컨텍스트 메뉴 (제목 변경, 카테고리 변경, 삭제)
- 키보드 단축키 지원 (Ctrl+O, Ctrl+F, Escape)

## 📸 스크린샷

<!-- 스크린샷 이미지를 추가하세요 -->
<!-- ![메인 화면](screenshots/main.png) -->
<!-- ![AI 자동 분류](screenshots/ai-classify.png) -->

## 🚀 설치 방법

### 방법 1: 릴리즈 다운로드
[Releases](../../releases) 페이지에서 최신 버전의 설치 파일을 다운로드하세요.

### 방법 2: 소스에서 빌드

```bash
# 저장소 클론
git clone https://github.com/yourusername/claude-chat-viewer.git
cd claude-chat-viewer

# 의존성 설치
npm install

# 개발 모드 실행
npm start

# 빌드 (Windows)
npm run build
```

## 🛠️ 기술 스택

- **Electron** - 크로스 플랫폼 데스크톱 앱 프레임워크
- **sql.js** - WebAssembly 기반 SQLite (카테고리/태그 데이터 저장)
- **node-fetch** - Ollama API 통신
- **adm-zip** - ZIP 파일 처리

## 📋 사용 방법

### 기본 사용법

1. Claude.ai에서 대화 내보내기 (Settings → Export Data)
2. 앱 실행 후 ZIP 파일 또는 폴더 열기
3. 대화 목록에서 원하는 대화 클릭

### AI 자동 분류 사용법

1. [Ollama](https://ollama.ai) 설치 및 실행
2. 모델 다운로드: `ollama pull gemma2` 또는 `ollama pull llama3.2`
3. 앱에서 🤖 버튼 클릭
4. 연결 테스트 → 모델 선택 → 분류 시작

### 데이터 저장 위치

카테고리/태그 데이터는 `C:\Database\claude-chat-viewer.db`에 SQLite 형식으로 저장됩니다.

## ⌨️ 키보드 단축키

| 단축키 | 기능 |
|--------|------|
| `Ctrl + O` | 파일 열기 |
| `Ctrl + F` | 검색창 포커스 |
| `Escape` | 모달 닫기 / 검색 초기화 |
| `F12` | 개발자 도구 열기 |

## 🤝 기여하기

버그 리포트, 기능 제안, PR 모두 환영합니다!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포할 수 있습니다.

## 🙏 감사의 말

- [Anthropic](https://anthropic.com) - Claude AI
- [Ollama](https://ollama.ai) - 로컬 AI 실행 환경
- [Electron](https://electronjs.org) - 데스크톱 앱 프레임워크

---

<p align="center">
  Made with ❤️ for Claude users
</p>
