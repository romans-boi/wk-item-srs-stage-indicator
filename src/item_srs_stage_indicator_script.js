// ==UserScript==
// @name         WaniKani Item SRS Stage Indicator
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Displays the exact item SRS stage (Apprentice 3, Guru 1, etc.), both before and after completing the review for the item.
// @author       romans-boi
// @match        https://www.wanikani.com/subjects/review
// @run-at       document-end
// @grant        none
// ==/UserScript==

(async function () {
    /* global Stimulus */

    // Correct namings for the stages
    const currentNames = ["Unlocked", "Apprentice", "Apprentice", "Apprentice", "Apprentice", "Guru", "Guru", "Master", "Enlightened", "Burned"];
    const correctedNames = ["Unlocked", "Apprentice I", "Apprentice II", "Apprentice III", "Apprentice IV", "Guru I", "Guru II", "Master", "Enlightened", "Burned"];

    let srsQueueController;

    window.addEventListener("turbo:load", () => {
        console.log("Turbo page finished loading");
        init();
    });

    function init() {
        addStyle();
        replaceSrsStageNames();

        srsQueueController = getController('quiz-queue');
        addDidChangeSrsListener();
        addNextQuestionEventListener();
    }

    function replaceSrsStageNames() {
        // Get the element that holds the SRS names, and replace them with the corrected ones.
        const srsStagesScript = document.getElementById('quiz-queue').querySelector(`[data-quiz-queue-target="subjectIdsWithSRS"]`);
        const srsStagesRaw = srsStagesScript.childNodes[0].data;
        const srsStagesCorrectedRaw = srsStagesRaw.replaceAll(JSON.stringify(currentNames), JSON.stringify(correctedNames));
        srsStagesScript.textContent = srsStagesCorrectedRaw;
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
            setCurrentSrsText();
        });
        setCurrentSrsText();

        function setCurrentSrsText() {
            const currentItemId = srsQueueController.quizQueue.currentItem.id;
            const subjectIdSrsMap = srsQueueController.quizQueue.srsManager.subjectIdSRSMap;
            const currentSrsStatusName = correctedNames[subjectIdSrsMap.get(currentItemId).srsPosition];

            const currentSrsTextDiv = document.querySelector(`div[class='character-header__current-srs-text']`);

            if (currentSrsTextDiv == undefined) {
                const currentSrsContainerHtml = `
                    <div class="character-header__current-srs-container" data-hidden=false>
                        <div class="character-header__current-srs-content">
                            <div class="character-header__current-srs-text">${currentSrsStatusName}</div>
                        </div>
                    </div>
                `;

                const characterHeader = document.querySelector(`div[class='character-header__content']`);
                characterHeader.insertAdjacentHTML('beforeend', currentSrsContainerHtml);
            } else {
                currentSrsTextDiv.textContent = currentSrsStatusName;
            }

            showCurrentSrsContainer();
        }
    }

    function getController(name) {
        return Stimulus.getControllerForElementAndIdentifier(document.querySelector(`[data-controller~="${name}"]`), name);
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