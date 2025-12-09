// ==UserScript==
// @name         WaniKani Item SRS Stage Indicator
// @namespace    http://tampermonkey.net/
// @version      1.3.0
// @description  Displays the exact item SRS stage (Apprentice IV, Guru I, etc.), both before and after completing a review for the item.
// @author       romans-boi
// @license      MIT
// @match        https://www.wanikani.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

// If you want the indicator in the top right corner with the stats, change this line to
// USE_TOP_MENU_BAR_VARIANT = true;
USE_TOP_MENU_BAR_VARIANT = true;

(async function () {
  const CURRENT_NAMES = [
    "Unlocked",
    "Apprentice",
    "Apprentice",
    "Apprentice",
    "Apprentice",
    "Guru",
    "Guru",
    "Master",
    "Enlightened",
    "Burned",
  ];
  const CORRECTED_NAMES = [
    "Unlocked",
    "Apprentice I",
    "Apprentice II",
    "Apprentice III",
    "Apprentice IV",
    "Guru I",
    "Guru II",
    "Master",
    "Enlightened",
    "Burned",
  ];

  const STAGE_TO_ICON_MAP = new Map([
    ["Apprentice I", "#wk-icon__srs-apprentice1"],
    ["Apprentice II", "#wk-icon__srs-apprentice2"],
    ["Apprentice III", "#wk-icon__srs-apprentice3"],
    ["Apprentice IV", "#wk-icon__srs-apprentice4"],
    ["Guru I", "#wk-icon__srs-guru5"],
    ["Guru II", "#wk-icon__srs-guru6"],
    ["Master", "#wk-icon__srs-master"],
    ["Enlightened", "#wk-icon__srs-enlightened"],
  ]);

  const TEXT_COLOR = new Map([
    ["Radical", "#a1dfff"],
    ["Kanji", "#ffc5ec"],
    ["Vocabulary", "#edcaff"],
  ]);

  const SUBJECT_IDS_WITH_SRS_TARGET = "subjectIdsWithSRS";

  let queueElement;
  let parentElement;
  let clonedQueueElement;

  window.addEventListener("turbo:load", (event) => {
    // If we're not on the review page, then ignore
    if (!/subjects\/review/.test(event.detail.url)) return;

    waitForQuizQueue(init);
  });

  function waitForQuizQueue(callback) {
    // Need to make sure we wait for quiz queue to be available first
    const observer = new MutationObserver((mutations, observer) => {
      const element = document.getElementById("quiz-queue");
      if (element) {
        observer.disconnect();
        callback();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function init() {
    // As recommended by Tofugu Scott: https://community.wanikani.com/t/updates-to-lessons-reviews-and-extra-study/60912/28
    queueElement = document.getElementById("quiz-queue");
    parentElement = queueElement.parentElement;
    clonedQueueElement = queueElement.cloneNode(true);
    queueElement.remove();

    addStyle();
    replaceSrsStageNames();

    addDidChangeSrsListener();
    addNextQuestionEventListener();

    parentElement.appendChild(clonedQueueElement);
  }

  function replaceSrsStageNames() {
    // Get the element that holds the SRS names, and replace them with the corrected ones.
    const srsStagesElement = clonedQueueElement.querySelector(
      `[data-quiz-queue-target="subjectIdsWithSRS"]`
    );
    const srsStagesText = srsStagesElement.textContent;
    const srsStagesCorrectedText = srsStagesText.replaceAll(
      JSON.stringify(CURRENT_NAMES),
      JSON.stringify(CORRECTED_NAMES)
    );
    srsStagesElement.textContent = srsStagesCorrectedText;
  }

  function showCurrentSrsContainer() {
    document.querySelector(
      ".character-header__current-srs-container"
    ).dataset.hidden = "false";
  }

  function hideCurrentSrsContainer() {
    document.querySelector(
      ".character-header__current-srs-container"
    ).dataset.hidden = "true";
  }

  function addDidChangeSrsListener() {
    window.addEventListener("didChangeSRS", (e) => {
      hideCurrentSrsContainer();
    });
  }

  function addNextQuestionEventListener() {
    window.addEventListener("willShowNextQuestion", (event) => {
      onNextQuestion(event.detail.subject);
    });

    function onNextQuestion(subject) {
      setCurrentSrsStageText(subject);
      showCurrentSrsContainer();
    }

    function setCurrentSrsStageText(subject) {
      const currentItemId = subject.id;

      // Get SRS stages config
      const srsStagesJson = JSON.parse(
        getQuizQueueTarget(SUBJECT_IDS_WITH_SRS_TARGET).textContent
      );
      const subjectIdSrsList = srsStagesJson.subject_ids_with_srs_info;

      // The tuple we get for a subject looks like this `[id, index, X]` where X is pointing to which array of SRS names to use within
      // srs_ids_stage_names, but from what I can tell... it doesn't matter? So I just use the local corrected names array for lookup.
      const currentItemSrsIndex = subjectIdSrsList.find(
        (subjectSrsInfo) => subjectSrsInfo[0] == currentItemId
      )[1];
      const currentSrsStageName = CORRECTED_NAMES[currentItemSrsIndex];

      const iconHtml = getIconHtmlFor(currentSrsStageName);

      if (USE_TOP_MENU_BAR_VARIANT) {
        const currentSrsContainerDiv = document.querySelector(
          `div[class='quiz-statistics__current-srs-container']`
        );

        if (currentSrsContainerDiv == undefined) {
          appendNewSrsContainerTopBarVariant(iconHtml, currentSrsStageName);
        } else {
          modifyExistingSrsContainerTopBarVariant(
            currentSrsContainerDiv,
            iconHtml,
            currentSrsStageName
          );
        }
      } else {
        const textColour = TEXT_COLOR.get(subject.type);

        const currentSrsContentDiv = document.querySelector(
          `div[class='character-header__current-srs-content']`
        );

        // If doesn't exist, create a new container with the icon and text element, otherwise change icon and text.
        if (currentSrsContentDiv == undefined) {
          appendNewSrsContainerItemVariant(
            textColour,
            iconHtml,
            currentSrsStageName
          );
        } else {
          modifyExistingSrsContainerItemVariant(
            currentSrsContentDiv,
            textColour,
            iconHtml,
            currentSrsStageName
          );
        }
      }

      function appendNewSrsContainerItemVariant(
        textColour,
        iconHtml,
        currentSrsStageName
      ) {
        const container = document.createElement("div");
        container.className = "character-header__current-srs-container";
        container.dataset.hidden = "false";

        const content = document.createElement("div");
        content.className = "character-header__current-srs-content";
        content.style.color = textColour;

        const icon = document.createElement("div");
        icon.className = "character-header__current-srs-icon";
        if (iconHtml == null) {
          icon.dataset.hidden = "true";
        } else {
          icon.innerHTML = iconHtml;
        }

        const text = document.createElement("div");
        text.className = "character-header__current-srs-text";
        text.textContent = currentSrsStageName;

        content.appendChild(icon);
        content.appendChild(text);
        container.appendChild(content);

        const characterHeader = document.querySelector(
          `div[class='character-header__content']`
        );

        characterHeader.appendChild(container);
      }

      function modifyExistingSrsContainerItemVariant(
        contentDiv,
        textColour,
        iconHtml,
        currentSrsStageName
      ) {
        const iconDiv = contentDiv.querySelector(
          `div[class='character-header__current-srs-icon']`
        );
        const textDiv = contentDiv.querySelector(
          `div[class='character-header__current-srs-text']`
        );

        if (iconHtml == null) {
          iconDiv.dataset.hidden = "true";
        } else {
          iconDiv.innerHTML = iconHtml;
        }
        textDiv.textContent = currentSrsStageName;
        contentDiv.style.color = textColour;
      }

      const topBarStyle = `
    <div class="subject-statistic-counts__item" title="Item Current SRS Stage">
        <div class="subject-statistic-counts__item-count">
            <div class="subject-statistic-counts__item-count-icon">
                <svg viewBox="0 0 512 512" aria-hidden="true">
                  <use href="#wk-icon__inbox"></use>
                </svg>
            </div>
            <span class="subject-statistic-counts__item-count-text">0</span>
        </div>
    </div>
  `;

      function appendNewSrsContainerTopBarVariant(
        iconHtml,
        currentSrsStageName
      ) {
        // Copying the structure and style classes of existing WaniKani statistics header.
        const container = document.createElement("div");
        container.className = "quiz-statistics__current-srs-container";

        const content = document.createElement("div");
        content.className = "quiz-statistics__current-srs-content";

        const icon = document.createElement("div");
        icon.className = "quiz-statistics__current-srs-icon";
        if (iconHtml == null) {
          icon.dataset.hidden = "true";
        } else {
          icon.innerHTML = iconHtml;
        }

        const text = document.createElement("div");
        text.className = "quiz-statistics__current-srs-text";
        text.textContent = currentSrsStageName;
        console.log([...currentSrsStageName].map(c => c.charCodeAt(0)));


        content.appendChild(icon);
        content.appendChild(text);
        container.appendChild(content);

        const statisticsHeader = document.querySelector(
          `div[class='quiz-statistics']`
        );

        statisticsHeader.prepend(container);
      }

      function modifyExistingSrsContainerTopBarVariant(
        containerDiv,
        iconHtml,
        currentSrsStageName
      ) {
        const iconDiv = containerDiv.querySelector(
          `div[class='quiz-statistics__item-count-icon']`
        );
        const textDiv = containerDiv.querySelector(
          `div[class='quiz-statistics__item-count-text']`
        );

        if (iconHtml == null) {
          iconDiv.dataset.hidden = "true";
        } else {
          iconDiv.innerHTML = iconHtml;
        }
        textDiv.textContent = currentSrsStageName;
      }
    }
  }

  function getIconHtmlFor(srsStage) {
    const iconRef = STAGE_TO_ICON_MAP.get(srsStage);
    if (iconRef == undefined) return null;

    return `
      <svg class="wk-icon wk-icon--current-srs" viewBox="0 0 512 512" aria-hidden="true">
        <use href="${iconRef}"></use>
      </svg>
    `;
  }

  function getQuizQueueTarget(target) {
    return clonedQueueElement.querySelector(
      `[data-quiz-queue-target="${target}"]`
    );
  }

  function addStyle() {
    // Add CSS style for current SRS elements
    const cssStyle = `

    .quiz-statistics__current-srs-container {
  display: flex;
  align-items: center;
  margin-right: 8px;
  white-space: pre-wrap;
}

    .quiz-statistics__current-srs-content {
  padding: 0px 4px;
    display: flex;
  align-items: center;
  border-radius: 3px;
}

.quiz-statistics__current-srs-icon {
  margin-right: 4px;
  display: flex;
}

.quiz-statistics__current-srs-text {
  white-space: nowrap;

}

            .character-header__current-srs-container {
                position:absolute;
                bottom:10px;
                left:0;
                width:100%;
                display:flex;
                justify-content:center;
                opacity:0.8;
                pointer-events:none;
                transform:translateY(0);
                transition:none
            }

            .character-header__current-srs-container[data-hidden=true] {
                opacity:0;
                transform:translateY(-10px);
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

            .character-header__current-srs-icon {
              display:flex;
              margin-right:var(--spacing-xtight)
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
                background-color: rgba(65, 65, 65, 1);
            }
        `;
    const styleEl = document.createElement("style");
    styleEl.id = "css_current-srs";
    styleEl.textContent = cssStyle;
    document.head.appendChild(styleEl);
  }
})();
