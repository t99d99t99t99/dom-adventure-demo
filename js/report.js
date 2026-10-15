const reportMessages = document.querySelector("#report-messages");
const hiddenEndingLink = document.querySelector(".demo-ending-link");

function makeRandomErrorText() {
    const punctuationRanges = [
        [33, 47],
        [58, 64],
        [91, 96],
        [123, 126]
    ];
    const length = 13 + Math.floor(Math.random() * 8);
    let errorText = "";

    for (let index = 0; index < length; index += 1) {
        const range = punctuationRanges[Math.floor(Math.random() * punctuationRanges.length)];
        const characterCode = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
        errorText += String.fromCharCode(characterCode);
    }

    return errorText;
}

function scrambleErrorText() {
    const errorText = makeRandomErrorText();
    document.title = errorText;
    hiddenEndingLink.textContent = errorText;
}

scrambleErrorText();
window.setInterval(scrambleErrorText, 300);

function watchForBarrierRemoval() {
    const barrier = document.querySelector("#barrier");
    let isShattering = false;

    function shatterBarrier() {
        document.body.append(barrier);

        const barrierStyle = window.getComputedStyle(barrier);
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const context = barrier.getContext("2d");
        const particleCanvas = document.createElement("canvas");
        const particleContext = particleCanvas.getContext("2d");
        const sampleCanvas = document.createElement("canvas");
        const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
        const dustSpacing = 18;
        const sweepDuration = 700;
        const particleDuration = 600;
        const particles = [];
        const startedAt = performance.now();

        barrier.width = viewportWidth;
        barrier.height = viewportHeight;
        particleCanvas.id = "barrier-dust-canvas";
        particleCanvas.width = viewportWidth;
        particleCanvas.height = viewportHeight;
        document.body.append(particleCanvas);
        sampleCanvas.width = viewportWidth;
        sampleCanvas.height = viewportHeight;

        function paintBarrier(targetContext) {
            targetContext.fillStyle = barrierStyle.backgroundColor;
            targetContext.fillRect(0, 0, viewportWidth, viewportHeight);
            targetContext.fillStyle = "#111923";

            for (let x = 0; x < viewportWidth; x += 24) {
                targetContext.fillRect(x, 0, 1, viewportHeight);
            }
            for (let y = 0; y < viewportHeight; y += 24) {
                targetContext.fillRect(0, y, viewportWidth, 1);
            }
        }

        paintBarrier(sampleContext);
        paintBarrier(context);
        barrier.style.background = "none";

        const image = sampleContext.getImageData(0, 0, viewportWidth, viewportHeight);
        const rowCount = Math.ceil(viewportHeight / dustSpacing);

        for (let y = 0; y < viewportHeight; y += dustSpacing) {
            for (let x = 0; x < viewportWidth; x += dustSpacing) {
                const sampleX = Math.min(viewportWidth - 1, x + Math.floor(dustSpacing / 2));
                const sampleY = Math.min(viewportHeight - 1, y + Math.floor(dustSpacing / 2));
                const pixelIndex = (sampleY * viewportWidth + sampleX) * 4;
                const color = `rgb(${image.data[pixelIndex]}, ${image.data[pixelIndex + 1]}, ${image.data[pixelIndex + 2]})`;

                particles.push({
                    x,
                    y,
                    color,
                    size: 2 + Math.random() * 3,
                    driftX: 24 + Math.random() * 90,
                    driftY: (Math.random() - 0.5) * 34,
                    delay: (y / (rowCount * dustSpacing)) * sweepDuration + Math.random() * 90,
                    cleared: false
                });
            }
        }

        sampleCanvas.width = 0;
        sampleCanvas.height = 0;

        function animate(now) {
            const elapsed = now - startedAt;
            let activeParticles = 0;
            particleContext.clearRect(0, 0, viewportWidth, viewportHeight);

            for (const particle of particles) {
                const particleTime = elapsed - particle.delay;
                if (particleTime < 0) {
                    activeParticles += 1;
                    continue;
                }

                if (!particle.cleared) {
                    context.clearRect(particle.x, particle.y, dustSpacing, dustSpacing);
                    particle.cleared = true;
                }

                if (particleTime >= particleDuration) continue;

                activeParticles += 1;
                const progress = particleTime / particleDuration;
                const easedProgress = 1 - (1 - progress) ** 2;
                const alpha = 1 - progress;
                const size = particle.size * (1 - progress * 0.65);

                particleContext.globalAlpha = alpha;
                particleContext.fillStyle = particle.color;
                particleContext.fillRect(
                    particle.x + particle.driftX * easedProgress,
                    particle.y + particle.driftY * easedProgress,
                    size,
                    size
                );
            }

            particleContext.globalAlpha = 1;

            if (activeParticles === 0) {
                barrier.remove();
                particleCanvas.remove();
                return;
            }

            window.requestAnimationFrame(animate);
        }

        window.requestAnimationFrame(animate);
    }

    const observer = new MutationObserver((changes) => {
        const barrierWasRemoved = changes.some((change) =>
            Array.from(change.removedNodes).includes(barrier)
        );
        if (!barrierWasRemoved || isShattering) return;

        isShattering = true;
        observer.disconnect();
        shatterBarrier();
    });

    observer.observe(document.body, { childList: true });
}

watchForBarrierRemoval();

const pseudoDiagnoses = [
    "DOM 트리 검사 중: 예상하지 못한 상위 요소를 발견했습니다.",
    "화면 레이어 분석 중: 배경 보호막이 페이지를 덮고 있습니다.",
    "요소 식별 검사 중: barrier라는 이름의 요소가 남아 있습니다.",
    "복구 경로 확인 중: 개발자 도구에서 수동 조치가 필요합니다.",
    "페이지 구조 검사 중: 표시되지 않는 링크가 감지되었습니다."
];

function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function addParagraph(parent, text, className = "report-message") {
    const paragraph = document.createElement("p");
    paragraph.className = className;
    paragraph.textContent = text;
    parent.append(paragraph);
    return paragraph;
}

function addCode(parent, code, className = "") {
    const block = document.createElement("pre");
    block.className = `code-example ${className}`.trim();
    const codeText = document.createElement("code");
    codeText.textContent = code;
    block.append(codeText);
    parent.append(block);
}

function addGuideSection(title) {
    const section = document.createElement("section");
    section.className = "guide-step";

    const heading = document.createElement("h2");
    heading.textContent = title;
    section.append(heading);
    return section;
}

function showSamplePage(section) {
    const fruits = [
        { id: "apple", emoji: "🍎" },
        { id: "banana", emoji: "🍌" },
        { id: "cherry", emoji: "🍒" },
        { id: "grapes", emoji: "🍇" },
        { id: "orange", emoji: "🍊" },
        { id: "peach", emoji: "🍑" },
        { id: "strawberry", emoji: "🍓" },
        { id: "watermelon", emoji: "🍉" },
        { id: "pineapple", emoji: "🍍" }
    ];

    const table = document.createElement("table");
    table.className = "sample-table";

    const tableHead = document.createElement("thead");
    const headingRow = document.createElement("tr");
    const previewHeading = document.createElement("th");
    previewHeading.scope = "col";
    previewHeading.textContent = "브라우저에 보이는 모습";
    const htmlHeading = document.createElement("th");
    htmlHeading.scope = "col";
    htmlHeading.textContent = "간단한 HTML 예시";
    headingRow.append(previewHeading, htmlHeading);
    tableHead.append(headingRow);

    const tableBody = document.createElement("tbody");
    const sampleRow = document.createElement("tr");
    const previewCell = document.createElement("td");
    const fruitGrid = document.createElement("div");
    fruitGrid.className = "fruit-grid";

    function renderFruitBlocks() {
        fruitGrid.replaceChildren();
        fruits.forEach((fruit) => {
            const fruitBlock = document.createElement("div");
            fruitBlock.className = "fruit-block";
            fruitBlock.id = fruit.id;

            const emoji = document.createElement("span");
            emoji.className = "fruit-emoji";
            emoji.setAttribute("aria-hidden", "true");
            emoji.textContent = fruit.emoji;

            const idLabel = document.createElement("code");
            idLabel.className = "fruit-id";
            idLabel.textContent = fruit.id;

            fruitBlock.append(emoji, idLabel);
            fruitGrid.append(fruitBlock);
        });
    }

    renderFruitBlocks();

    const resetButton = document.createElement("button");
    resetButton.className = "fruit-reset-button";
    resetButton.type = "button";
    resetButton.textContent = "과일 다시 놓기";
    resetButton.addEventListener("click", renderFruitBlocks);
    previewCell.append(fruitGrid, resetButton);

    const htmlCell = document.createElement("td");
    const htmlLines = fruits.map(({ id, emoji }) => `<div id="${id}">${emoji} ${id}</div>`);
    const sampleHtml = htmlLines.join("\n");
    addCode(htmlCell, sampleHtml, "table-code");

    sampleRow.append(previewCell, htmlCell);
    tableBody.append(sampleRow);
    table.append(tableHead, tableBody);
    section.append(table);

    addParagraph(section, "각 과일 칸은 페이지의 한 부분이고, 아래에 적힌 이름은 그 부분의 id입니다. 예를 들어 사과 칸의 id는 apple이에요. 아래 명령은 그 이름을 가진 칸 하나를 찾아 화면에서 없앱니다. 과일 칸은 다시 불러올 수 있으니 편하게 해 보세요.");
    addCode(section, 'document.getElementById("apple").remove();');
}

function showRepairGuide() {
    reportMessages.replaceChildren();

    const guideSteps = [];

    const devtools = addGuideSection("1. 오른쪽에 열린 창 살펴보기");
    addParagraph(devtools, "오른쪽에 열린 창은 Chrome의 개발자 도구예요. 웹페이지 안에 어떤 내용이 있는지 살펴보고, 브라우저에 짧은 지시를 내려 볼 수 있는 보조 도구입니다. 창의 위치는 설정에 따라 오른쪽이나 아래쪽일 수 있어요.");
    addParagraph(devtools, "창을 닫았더라도 괜찮아요. F12 또는 Ctrl+Shift+I를 누르면 다시 열립니다. Mac에서는 ⌘+⌥+I를 누르세요.");
    guideSteps.push(devtools);

    const consoleGuide = addGuideSection("2. ‘콘솔’ 탭으로 이동하기");
    addParagraph(consoleGuide, "개발자 도구 위쪽에서 ‘콘솔’(Console) 탭을 눌러 주세요. 콘솔은 브라우저가 보내는 메시지를 보여 주고, 우리가 입력한 지시를 실행하는 곳이에요.");
    addParagraph(consoleGuide, "이 지시는 JavaScript라는 언어로 적습니다. JavaScript는 웹페이지에 ‘이 글을 찾아 줘’ 또는 ‘이 부분을 바꿔 줘’라고 말할 때 브라우저가 알아듣는 말이에요. 지금은 프로그래밍을 몰라도 괜찮습니다. 명령어를 입력하고 Enter를 누르면 돼요.");
    guideSteps.push(consoleGuide);

    const documentGuide = addGuideSection("3. 페이지의 한 부분을 찾아보기");
    addParagraph(documentGuide, "HTML은 웹페이지의 글과 모양을 적어 둔 설계도예요. 제목, 문장, 버튼, 배경처럼 페이지를 이루는 각각의 부분을 ‘요소’라고 부릅니다. 브라우저는 이 설계도를 읽어 어떤 부분이 어떤 부분 안에 있는지 정리해요. 이 연결 모양을 나무의 가지처럼 그릴 수 있어서 ‘DOM 트리’라고도 합니다.");
    addParagraph(documentGuide, 'document는 지금 보고 있는 페이지 전체를 가리키는 이름입니다. document.getElementById("apple")는 그 페이지에서 id가 apple인 부분을 찾아 달라는 뜻이에요. 이름표는 정확히 적어야 하고, 괄호 안에는 앞에 #을 붙이지 않습니다.');
    showSamplePage(documentGuide);
    guideSteps.push(documentGuide);

    const removeGuide = addGuideSection("4. 마지막 단서");
    addParagraph(removeGuide, '이 페이지의 뒷배경을 덮고 있는 보호막도 하나의 요소이고, 그 id는 "barrier"입니다. 여기서 앞으로 더 나아가기 위해서는 그 보호막을 제거해야 해요. 방금 과일 칸에서 연습한 것처럼, 이름표로 페이지의 한 부분을 찾고 화면에서 치우는 방법을 이 보호막에도 적용해 보세요.');
    guideSteps.push(removeGuide);

    let currentStep = 0;
    const navigation = document.createElement("nav");
    navigation.className = "guide-navigation";
    navigation.setAttribute("aria-label", "문제 해결 안내 단계");

    const previousButton = document.createElement("button");
    previousButton.className = "guide-nav-button";
    previousButton.type = "button";
    previousButton.textContent = "이전";

    const stepCount = document.createElement("span");
    stepCount.className = "guide-step-count";
    stepCount.setAttribute("aria-live", "polite");

    const nextButton = document.createElement("button");
    nextButton.className = "guide-nav-button";
    nextButton.type = "button";
    nextButton.textContent = "다음";

    navigation.append(previousButton, stepCount, nextButton);

    function renderStep() {
        reportMessages.replaceChildren(guideSteps[currentStep], navigation);
        previousButton.disabled = currentStep === 0;
        nextButton.disabled = currentStep === guideSteps.length - 1;
        stepCount.textContent = `${currentStep + 1} / ${guideSteps.length}`;
    }

    previousButton.addEventListener("click", () => {
        if (currentStep === 0) return;
        currentStep -= 1;
        renderStep();
    });

    nextButton.addEventListener("click", () => {
        if (currentStep === guideSteps.length - 1) return;
        currentStep += 1;
        renderStep();
    });

    renderStep();
}

async function showDiagnosis() {
    await wait(350);
    addParagraph(reportMessages, "오류를 분석하는 중입니다...", "report-message report-status");

    const remainingDiagnoses = [...pseudoDiagnoses];
    for (let index = 0; index < 3; index += 1) {
        await wait(700);
        const randomIndex = Math.floor(Math.random() * remainingDiagnoses.length);
        const [diagnosis] = remainingDiagnoses.splice(randomIndex, 1);
        addParagraph(reportMessages, diagnosis, "report-message report-diagnosis");
    }

    await wait(800);
    addParagraph(reportMessages, "알 수 없는 공격에 의해 DOM이 오염되었습니다.", "report-message report-alert");

    await wait(700);
    addParagraph(reportMessages, "개발자 도구를 이용해 DOM을 복구하십시오.");

    await wait(500);
    const repairButton = document.createElement("button");
    repairButton.className = "report-action";
    repairButton.type = "button";
    repairButton.textContent = "문제 해결사 불러오기";
    repairButton.addEventListener("click", showRepairGuide);
    reportMessages.append(repairButton);
}

showDiagnosis();
