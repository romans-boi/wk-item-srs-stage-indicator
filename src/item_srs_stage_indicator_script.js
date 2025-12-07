// ==UserScript==
// @name         WaniKani Item SRS Stage Indicator
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Displays the exact item SRS stage (Apprentice 3, Guru 1, etc.), both before and after completing the review for the item.
// @author       romans-boi
// @match        https://www.wanikani.com/subjects/review
// @run-at       document-end
// @grant        none
// ==/UserScript==

(async function () {
    // Correct namings for the stages
    const CURRENT_NAMES = ["Unlocked", "Apprentice", "Apprentice", "Apprentice", "Apprentice", "Guru", "Guru", "Master", "Enlightened", "Burned"];
    const CORRECTED_NAMES = ["Unlocked", "Apprentice I", "Apprentice II", "Apprentice III", "Apprentice IV", "Guru I", "Guru II", "Master", "Enlightened", "Burned"];

    const SUBJECT_IDS_WITH_SRS_TARGET = "subjectIdsWithSRS";
    const SUBJECTS_TARGET = "subjects";

    let queueElement;
    let parentElement;
    let clonedQueueElement;

    init();

    function init() {
        // As recommended by Tofugu Scott: https://community.wanikani.com/t/updates-to-lessons-reviews-and-extra-study/60912/28
        queueElement = document.getElementById('quiz-queue');
        parentElement = queueElement.parentElement;
        queueElement.remove();
        clonedQueueElement = queueElement.cloneNode(true);

        addStyle();
        replaceSrsStageNames();

        addDidChangeSrsListener()
        addNextQuestionEventListener()

        parentElement.appendChild(clonedQueueElement)
    }

    function replaceSrsStageNames() {
        // Get the element that holds the SRS names, and replace them with the corrected ones.
        const srsStagesElement = getQuizQueueTarget(SUBJECT_IDS_WITH_SRS_TARGET);
        const srsStagesText = srsStagesElement.textContent;
        const srsStagesCorrectedText = srsStagesText.replaceAll(JSON.stringify(CURRENT_NAMES), JSON.stringify(CORRECTED_NAMES));
        srsStagesElement.textContent = srsStagesCorrectedText;
    }

    function showCurrentSrsContainer() {
        document.querySelector('.character-header__current-srs-container').dataset.hidden = "false";
    }

    function hideCurrentSrsContainer() {
        document.querySelector('.character-header__current-srs-container').dataset.hidden = "true";
    }

    function addDidChangeSrsListener() {
        window.addEventListener("didChangeSRS", () => hideCurrentSrsContainer());
    }

    function addNextQuestionEventListener() {
        window.addEventListener("willShowNextQuestion", () => {
            onNextQuestion();
        });
        onNextQuestion();

        function onNextQuestion() {
            setCurrentSrsStageText();
            showCurrentSrsContainer();
        }

        function setCurrentSrsStageText() {
            // Get SRS stages config
            const srsStagesJson = JSON.parse(getQuizQueueTarget(SUBJECT_IDS_WITH_SRS_TARGET).textContent);
            const subjectIdSrsList = srsStagesJson.subject_ids_with_srs_info;

            // Get current queue config
            const queueJson = JSON.parse(getQuizQueueTarget(SUBJECTS_TARGET).textContent);
            const currentItemId = queueJson[0].id;

            // The tuple we get for a subject looks like this `[id, index, X]` where X is pointing to which array of SRS names to use within
            // srs_ids_stage_names, but from what I can tell... it doesn't matter? So I just use the local corrected names array.
            const currentItemSrsIndex = subjectIdSrsList.find((subjectSrsInfo) => subjectSrsInfo[0] == currentItemId)[1];
            const currentSrsStageName = CORRECTED_NAMES[currentItemSrsIndex];

            const currentSrsTextDiv = document.querySelector(`div[class='character-header__current-srs-text']`);

            // If doesn't exist, create a new container with the text element, otherwise change text.
            if (currentSrsTextDiv == undefined) {
                const currentSrsContainerHtml = `
                    <div class="character-header__current-srs-container" data-hidden=false>
                        <div class="character-header__current-srs-content">
                            <div class="character-header__current-srs-text">${currentSrsStageName}</div>
                        </div>
                    </div>
                `;

                const characterHeader = document.querySelector(`div[class='character-header__content']`);
                characterHeader.insertAdjacentHTML('beforeend', currentSrsContainerHtml);
            } else {
                currentSrsTextDiv.textContent = currentSrsStageName;
            }
        }
    }

    function getQuizQueueTarget(target) {
        return clonedQueueElement.querySelector(`[data-quiz-queue-target="${target}"]`)
    }

    function addStyle() {
        // Add CSS style for current SRS elements
        const cssStyle = `
            .character-header__current-srs-container {
                position:absolute;
                bottom:10px;
                left:0;
                width:100%;
                display:flex;
                justify-content:center;
                opacity:1;
                pointer-events:none;
                transform:translateY(0);
                transition:none
            }

            .character-header__current-srs-container[data-hidden=true] {
                opacity:0;
                transform:translateY(10px);
                transition:all .5s ease-in
            }

            .character-header__current-srs-content {
                display:flex;
                align-items:center;
                padding:var(--spacing-xtight);
                font-weight:400;
                line-height:1.4;
                font-size:14px;
                text-shadow:0 1px 0 rgba(0,0,0,.2);
                border-radius:var(--border-radius-tight)
            }

            @supports(container-type: inline-size) {
                @container (min-width: 768px) {
                    .character-header__current-srs-content {
                        font-size:18px
                    }
                }
            }

            @supports not (container-type: inline-size) {
                @media only screen and (min-width: 768px) {
                    .character-header__current-srs-content {
                        font-size:18px
                    }
                }
            }

            .character-header__current-srs-container .character-header__current-srs-content {
                background-color:var(--color-charcoal);
                color:var(--color-quiz-srs-correct-text-color);
                text-shadow:var(--color-quiz-srs-correct-text-shadow)
            }
        `;
        const styleEl = document.createElement("style");
        styleEl.id = "css_current-srs";
        styleEl.textContent = cssStyle;
        document.head.appendChild(styleEl);
    }
})();