const board = document.getElementById("board");
        const canvas = document.getElementById("canvas");
        const boardContainer = document.getElementById("board-container");
        const mapSelect = document.getElementById("mapSelect");
        const musicSelect = document.getElementById("musicSelect");
        const audioPlayer = document.getElementById("audioPlayer");
        const resetButton = document.getElementById("resetBoard");
        const resetButtonFloating = document.getElementById("resetBoardFloating");
        const customMapInput = document.getElementById("customMap");
        const customMapInputFloating = document.getElementById("customMapFloating");
        const toggleFullscreenButton = document.getElementById("toggleFullscreen");
        const toggleFullscreenButtonFloating = document.getElementById("toggleFullscreenFloating");
        const floatingPanel = document.getElementById("floatingPanel");
        const resetModal = document.getElementById("resetModal");
        const confirmResetYes = document.getElementById("confirmResetYes");
        const confirmResetNo = document.getElementById("confirmResetNo");
        const saveBoardButton = document.getElementById("saveBoard");
        const saveBoardButtonFloating = document.getElementById("saveBoardFloating");
        const loadBoardInput = document.getElementById("loadBoardInput");
        const loadBoardInputFloating = document.getElementById("loadBoardFloatingInput");
        const notesTextarea = document.getElementById("notes");
        const diceTypeSelect = document.getElementById("diceType");
        const diceCountInput = document.getElementById("diceCount");
        const diceModifierInput = document.getElementById("diceModifier");
        const rollDiceButton = document.getElementById("rollDice");
        const diceResultTextarea = document.getElementById("diceResult");

        let zoomLevel = 1;
        const minZoom = 0.4;
        const maxZoom = 2;
        const zoomStep = 0.1;
        let selectedToken = null;
        let selectedTokenSrc = null;
        let selectedTokenSize = null;
        const gridSize = 50;
        const cellSize = 5000 / gridSize; // 100px por célula
        const baseWidth = 5000;
        const baseHeight = 5000;
        let isPanning = false;
        let startX, startY, startScrollLeft, startScrollTop;
        let hasMoved = false;
        const moveThreshold = 5;
        let backgroundImage = null;
        let rollHistory = [];

        const ctx = canvas.getContext("2d");
        canvas.width = baseWidth;
        canvas.height = baseHeight;

        function updateBoardSize() {
            const scaledWidth = baseWidth * zoomLevel;
            const scaledHeight = baseHeight * zoomLevel;
            board.style.width = `${scaledWidth}px`;
            board.style.height = `${scaledHeight}px`;
            canvas.style.transform = `scale(${zoomLevel})`;

            document.querySelectorAll(".draggable-token").forEach(token => {
                const baseX = parseFloat(token.dataset.baseLeft);
                const baseY = parseFloat(token.dataset.baseTop);
                const cellWidth = baseWidth / gridSize;
                const tokenSize = token.classList.contains("gargantuan") ? 4 : token.classList.contains("huge") ? 3 : token.classList.contains("large") ? 2 : 1;
                const tokenWidth = cellWidth * tokenSize;
                const isFlipped = token.classList.contains("flipped");
                const adjustedLeft = isFlipped ? baseX * zoomLevel + tokenWidth * zoomLevel : baseX * zoomLevel;
                token.style.left = `${adjustedLeft}px`;
                token.style.top = `${baseY * zoomLevel}px`;
                token.style.transform = isFlipped ? `scaleX(-1) scale(${zoomLevel})` : `scale(${zoomLevel})`;
            });
        }

        function loadMap(imageSrc) {
            const img = new Image();
            img.src = imageSrc;
            img.onload = () => {
                backgroundImage = img;
                drawBoard();
            };
            img.onerror = () => {
                backgroundImage = null;
                drawBoard();
            };
        }

        function drawBoard() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (backgroundImage) {
                ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
            } else {
                ctx.fillStyle = "#1e1e1e";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.strokeStyle = "#000";
            ctx.lineWidth = 0.5;

            const rect = boardContainer.getBoundingClientRect();
            const scrollLeft = boardContainer.scrollLeft / zoomLevel;
            const scrollTop = boardContainer.scrollTop / zoomLevel;
            const visibleWidth = rect.width / zoomLevel;
            const visibleHeight = rect.height / zoomLevel;

            const startCol = Math.max(0, Math.floor(scrollLeft / cellSize));
            const startRow = Math.max(0, Math.floor(scrollTop / cellSize));
            const endCol = Math.min(gridSize, Math.ceil((scrollLeft + visibleWidth) / cellSize));
            const endRow = Math.min(gridSize, Math.ceil((scrollTop + visibleHeight) / cellSize));

            for (let col = startCol; col <= endCol; col++) {
                ctx.beginPath();
                ctx.moveTo(col * cellSize, startRow * cellSize);
                ctx.lineTo(col * cellSize, endRow * cellSize);
                ctx.stroke();
            }
            for (let row = startRow; row <= endRow; row++) {
                ctx.beginPath();
                ctx.moveTo(startCol * cellSize, row * cellSize);
                ctx.lineTo(endCol * cellSize, row * cellSize);
                ctx.stroke();
            }

            const mousePos = getMousePos(lastMouseX, lastMouseY);
            if (mousePos) {
                const col = Math.floor(mousePos.x / cellSize);
                const row = Math.floor(mousePos.y / cellSize);
                if (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
                    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                }
            }
        }

        let lastMouseX = 0, lastMouseY = 0;
        function getMousePos(clientX, clientY) {
            const rect = boardContainer.getBoundingClientRect();
            const x = ((clientX - rect.left) + boardContainer.scrollLeft) / zoomLevel;
            const y = ((clientY - rect.top) + boardContainer.scrollTop) / zoomLevel;
            if (x >= 0 && x < baseWidth && y >= 0 && y < baseHeight) {
                return { x, y };
            }
            return null;
        }

        canvas.addEventListener("mousemove", (e) => {
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            drawBoard();
        });

        mapSelect.addEventListener("change", (e) => {
            loadMap(e.target.value);
            saveBoardState();
        });

        function handleMapUpload(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    loadMap(e.target.result);
                    mapSelect.value = "";
                    saveBoardState();
                };
                reader.readAsDataURL(file);
            }
        }

        customMapInput.addEventListener("change", handleMapUpload);
        customMapInputFloating.addEventListener("change", handleMapUpload);

        loadMap(mapSelect.value);

        musicSelect.addEventListener("change", () => {
            const source = audioPlayer.querySelector("source");
            source.src = musicSelect.value;
            audioPlayer.load();
            audioPlayer.play();
            saveBoardState();
        });

        function handleReset() {
            resetModal.style.display = "flex";
        }

        function closeModal() {
            resetModal.style.display = "none";
        }

        confirmResetYes.addEventListener("click", () => {
            document.querySelectorAll(".draggable-token").forEach(el => el.remove());
            deselectToken();
            drawBoard();
            saveBoardState();
            closeModal();
        });

        confirmResetNo.addEventListener("click", closeModal);

        resetModal.addEventListener("click", (e) => {
            if (e.target === resetModal) {
                closeModal();
            }
        });

        resetButton.addEventListener("click", handleReset);
        resetButtonFloating.addEventListener("click", handleReset);

        function restrictScroll() {
            const maxScrollLeft = boardContainer.scrollWidth - boardContainer.clientWidth;
            const maxScrollTop = boardContainer.scrollHeight - boardContainer.clientHeight;
            boardContainer.scrollLeft = Math.min(Math.max(boardContainer.scrollLeft, 0), maxScrollLeft);
            boardContainer.scrollTop = Math.min(Math.max(boardContainer.scrollTop, 0), maxScrollTop);
        }

        function updateZoom(newZoom, clientX, clientY) {
            const oldZoom = zoomLevel;
            zoomLevel = Math.min(Math.max(newZoom, minZoom), maxZoom);
            if (oldZoom === zoomLevel) return;

            const rect = boardContainer.getBoundingClientRect();
            const mouseX = ((clientX - rect.left) + boardContainer.scrollLeft) / oldZoom;
            const mouseY = ((clientY - rect.top) + boardContainer.scrollTop) / oldZoom;

            updateBoardSize();

            boardContainer.scrollLeft = mouseX * zoomLevel - (clientX - rect.left);
            boardContainer.scrollTop = mouseY * zoomLevel - (clientY - rect.top);

            restrictScroll();
            drawBoard();
        }

        boardContainer.addEventListener("wheel", (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
            updateZoom(zoomLevel + delta, e.clientX, e.clientY);
        });

        boardContainer.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            isPanning = true;
            hasMoved = false;
            boardContainer.classList.add("grabbing");
            startX = e.clientX;
            startY = e.clientY;
            startScrollLeft = boardContainer.scrollLeft;
            startScrollTop = boardContainer.scrollTop;
        });

        boardContainer.addEventListener("mousemove", (e) => {
            if (!isPanning) return;
            e.preventDefault();
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) > moveThreshold || Math.abs(dy) > moveThreshold) {
                hasMoved = true;
            }
            boardContainer.scrollLeft = startScrollLeft - dx;
            boardContainer.scrollTop = startScrollTop - dy;
            restrictScroll();
            drawBoard();
        });

        boardContainer.addEventListener("mouseup", () => {
            isPanning = false;
            boardContainer.classList.remove("grabbing");
        });

        boardContainer.addEventListener("mouseleave", () => {
            if (isPanning) {
                isPanning = false;
                boardContainer.classList.remove("grabbing");
            }
        });

        boardContainer.addEventListener("keydown", (e) => {
            if (e.key === "ArrowLeft") {
                boardContainer.scrollLeft -= 50;
                e.preventDefault();
            } else if (e.key === "ArrowRight") {
                boardContainer.scrollLeft += 50;
                e.preventDefault();
            } else if (e.key === "ArrowUp") {
                boardContainer.scrollTop -= 50;
                e.preventDefault();
            } else if (e.key === "ArrowDown") {
                boardContainer.scrollTop += 50;
                e.preventDefault();
            }
            restrictScroll();
            drawBoard();
        });

        function deselectToken() {
            if (selectedToken) {
                selectedToken.classList.remove("selected");
                selectedToken = null;
                selectedTokenSrc = null;
                selectedTokenSize = null;
            }
        }

        function isAreaFree(row, col, size, excludeToken = null) {
            const sizeMap = {
                normal: 1,
                large: 2,
                huge: 3,
                gargantuan: 4
            };
            const tokenSize = sizeMap[size] || 1;
            const tokens = document.querySelectorAll(".draggable-token");

            for (let r = row; r < row + tokenSize; r++) {
                for (let c = col; c < col + tokenSize; c++) {
                    if (r >= gridSize || c >= gridSize) {
                        return false;
                    }
                    for (const token of tokens) {
                        if (token === excludeToken) continue;
                        const tokenLeft = parseFloat(token.dataset.baseLeft);
                        const tokenTop = parseFloat(token.dataset.baseTop);
                        const cellWidth = baseWidth / gridSize;
                        const tokenRow = Math.floor(tokenTop / cellWidth);
                        const tokenCol = Math.floor(tokenLeft / cellWidth);
                        let tokenArea = 1;
                        if (token.classList.contains("gargantuan")) tokenArea = 4;
                        else if (token.classList.contains("huge")) tokenArea = 3;
                        else if (token.classList.contains("large")) tokenArea = 2;

                        if (
                            r >= tokenRow &&
                            r < tokenRow + tokenArea &&
                            c >= tokenCol &&
                            c < tokenCol + tokenArea
                        ) {
                            return false;
                        }
                    }
                }
            }
            return true;
        }

        function placeToken(row, col, isShiftHeld) {
            const cellWidth = baseWidth / gridSize;
            const cellHeight = baseHeight / gridSize;
            const baseX = col * cellWidth;
            const baseY = row * cellHeight;

            if (selectedTokenSize === "large" && (row >= gridSize - 1 || col >= gridSize - 1)) {
                return;
            }
            if (selectedTokenSize === "huge" && (row >= gridSize - 2 || col >= gridSize - 2)) {
                return;
            }
            if (selectedTokenSize === "gargantuan" && (row >= gridSize - 3 || col >= gridSize - 3)) {
                return;
            }

            if (selectedTokenSrc) {
                if (!isAreaFree(row, col, selectedTokenSize)) {
                    return;
                }

                const newToken = document.createElement("img");
                newToken.src = selectedTokenSrc;
                newToken.classList.add("draggable-token");
                if (selectedTokenSize === "large") {
                    newToken.classList.add("large");
                    newToken.setAttribute("aria-label", "Large token");
                } else if (selectedTokenSize === "huge") {
                    newToken.classList.add("huge");
                    newToken.setAttribute("aria-label", "Huge token");
                } else if (selectedTokenSize === "gargantuan") {
                    newToken.classList.add("gargantuan");
                    newToken.setAttribute("aria-label", "Gargantuan token");
                } else {
                    newToken.setAttribute("aria-label", "Token");
                }
                newToken.style.position = "absolute";
                newToken.style.left = `${baseX * zoomLevel}px`;
                newToken.style.top = `${baseY * zoomLevel}px`;
                newToken.dataset.baseLeft = baseX;
                newToken.dataset.baseTop = baseY;
                const tokenWidth = cellWidth * (selectedTokenSize === "gargantuan" ? 4 : selectedTokenSize === "huge" ? 3 : selectedTokenSize === "large" ? 2 : 1);
                const tokenHeight = cellHeight * (selectedTokenSize === "gargantuan" ? 4 : selectedTokenSize === "huge" ? 3 : selectedTokenSize === "large" ? 2 : 1);
                newToken.style.width = `${tokenWidth}px`;
                newToken.style.height = `${tokenHeight}px`;
                newToken.style.transform = `scale(${zoomLevel})`;
                newToken.style.zIndex = "10";
                board.appendChild(newToken);
                setupTokenEvents(newToken);
                if (!isShiftHeld) {
                    deselectToken();
                }
                saveBoardState();
            } else if (selectedToken && selectedToken.classList.contains("draggable-token")) {
                let tokenSize = "normal";
                if (selectedToken.classList.contains("gargantuan")) tokenSize = "gargantuan";
                else if (selectedToken.classList.contains("huge")) tokenSize = "huge";
                else if (selectedToken.classList.contains("large")) tokenSize = "large";

                if (tokenSize === "large" && (row >= gridSize - 1 || col >= gridSize - 1)) {
                    return;
                }
                if (tokenSize === "huge" && (row >= gridSize - 2 || col >= gridSize - 2)) {
                    return;
                }
                if (tokenSize === "gargantuan" && (row >= gridSize - 3 || col >= gridSize - 3)) {
                    return;
                }

                if (!isAreaFree(row, col, tokenSize, selectedToken)) {
                    return;
                }

                const tokenSizeNum = tokenSize === "gargantuan" ? 4 : tokenSize === "huge" ? 3 : tokenSize === "large" ? 2 : 1;
                const tokenWidth = cellWidth * tokenSizeNum;
                const isFlipped = selectedToken.classList.contains("flipped");
                const adjustedLeft = isFlipped ? baseX * zoomLevel + tokenWidth * zoomLevel : baseX * zoomLevel;
                selectedToken.style.left = `${adjustedLeft}px`;
                selectedToken.style.top = `${baseY * zoomLevel}px`;
                selectedToken.dataset.baseLeft = baseX;
                selectedToken.dataset.baseTop = baseY;
                selectedToken.style.transform = isFlipped ? `scaleX(-1) scale(${zoomLevel})` : `scale(${zoomLevel})`;
                if (!isShiftHeld) {
                    deselectToken();
                }
                saveBoardState();
            }
        }

        function setupTokenEvents(token) {
            token.addEventListener("click", (e) => {
                e.stopPropagation();
                if (selectedToken === token) {
                    deselectToken();
                } else {
                    deselectToken();
                    selectedToken = token;
                    selectedToken.classList.add("selected");
                }
            });

            token.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                if (selectedToken === token) {
                    deselectToken();
                }
                token.remove();
                saveBoardState();
            });

            token.addEventListener("dblclick", (e) => {
                e.stopPropagation();
                token.classList.toggle("flipped");
                const cellWidth = baseWidth / gridSize;
                const baseX = parseFloat(token.dataset.baseLeft);
                const tokenSize = token.classList.contains("gargantuan") ? 4 : token.classList.contains("huge") ? 3 : token.classList.contains("large") ? 2 : 1;
                const tokenWidth = cellWidth * tokenSize;
                const isFlipped = token.classList.contains("flipped");
                const adjustedLeft = isFlipped ? baseX * zoomLevel + tokenWidth * zoomLevel : baseX * zoomLevel;
                token.style.left = `${adjustedLeft}px`;
                token.style.transform = isFlipped ? `scaleX(-1) scale(${zoomLevel})` : `scale(${zoomLevel})`;
                saveBoardState();
            });
        }

        document.querySelectorAll(".token").forEach((token) => {
            token.addEventListener("click", (e) => {
                e.stopPropagation();
                if (selectedToken === token) {
                    deselectToken();
                } else {
                    deselectToken();
                    selectedToken = token;
                    selectedTokenSrc = token.src;
                    if (token.closest("#gargantuanMonsterTokens")) {
                        selectedTokenSize = "gargantuan";
                    } else if (token.closest("#hugeMonsterTokens") || token.closest("#hugeFeatureTokens")) {
                        selectedTokenSize = "huge";
                    } else if (token.closest("#largeMonsterTokens") || token.closest("#largeFeatureTokens")) {
                        selectedTokenSize = "large";
                    } else {
                        selectedTokenSize = "normal";
                    }
                    selectedToken.classList.add("selected");
                }
            });
        });

        canvas.addEventListener("click", (e) => {
            e.stopPropagation();
            if (hasMoved) {
                return;
            }
            if (selectedToken) {
                const mousePos = getMousePos(e.clientX, e.clientY);
                if (mousePos) {
                    const cellWidth = baseWidth / gridSize;
                    const cellHeight = baseHeight / gridSize;
                    const col = Math.floor(mousePos.x / cellWidth);
                    const row = Math.floor(mousePos.y / cellHeight);

                    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
                        placeToken(row, col, e.shiftKey);
                    }
                }
            }
        });

        document.querySelectorAll(".collapsible").forEach(button => {
            button.addEventListener("click", () => {
                button.classList.toggle("active");
                const content = button.nextElementSibling;
                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                }
            });
        });

        const panelCollapsible = document.querySelector(".panel-collapsible");
        panelCollapsible.addEventListener("click", (e) => {
            if (e.target === panelCollapsible) {
                const panelContent = panelCollapsible.nextElementSibling;
                if (floatingPanel.classList.contains("collapsed")) {
                    floatingPanel.classList.remove("collapsed");
                    panelCollapsible.classList.remove("collapsed");
                    panelContent.style.maxHeight = panelContent.scrollHeight + "px";
                } else {
                    floatingPanel.classList.add("collapsed");
                    panelCollapsible.classList.add("collapsed");
                    panelContent.style.maxHeight = null;
                }
            }
        });

        let isDragging = false;
        let dragStartX, dragStartY, panelStartX, panelStartY;

        panelCollapsible.addEventListener("mousedown", (e) => {
            if (!document.fullscreenElement) return;
            if (e.button !== 0) return;
            isDragging = true;
            floatingPanel.classList.add("dragging");
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            const rect = floatingPanel.getBoundingClientRect();
            panelStartX = rect.left;
            panelStartY = rect.top;
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            let newLeft = panelStartX + dx;
            let newTop = panelStartY + dy;
            const panelWidth = floatingPanel.offsetWidth;
            const panelHeight = floatingPanel.offsetHeight;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            newLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelWidth));
            newTop = Math.max(0, Math.min(newTop, viewportHeight - panelHeight));
            floatingPanel.style.left = `${newLeft}px`;
            floatingPanel.style.top = `${newTop}px`;
        });

        document.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                floatingPanel.classList.remove("dragging");
            }
        });

        rollDiceButton.addEventListener("click", () => {
            const diceType = parseInt(diceTypeSelect.value);
            const diceCount = parseInt(diceCountInput.value) || 1;
            const modifier = parseInt(diceModifierInput.value) || 0;
            const diceSound = document.getElementById("diceSound");

            if (diceCount < 1) {
                diceResultTextarea.value = "Please enter a valid number of dice (1 or more).";
                return;
            }

            diceSound.currentTime = 0;
            diceSound.play().catch(error => {
                console.error("Erro ao tocar o som dos dados:", error);
            });

            const results = [];
            let total = 0;

            if (diceType === 100) {
                for (let i = 0; i < diceCount; i++) {
                    const tens = Math.floor(Math.random() * 10);
                    const units = Math.floor(Math.random() * 10);
                    const roll = (tens * 10) + units;
                    const finalRoll = roll === 0 ? 100 : roll;
                    results.push(finalRoll);
                    total += finalRoll;
                }
            } else {
                for (let i = 0; i < diceCount; i++) {
                    const roll = Math.floor(Math.random() * diceType) + 1;
                    results.push(roll);
                    total += roll;
                }
            }

            total += modifier;

            results.forEach((result, index) => {
                const diceElement = document.createElement("div");
                diceElement.classList.add("dice-animation");
                diceElement.textContent = result;
                diceElement.setAttribute("aria-label", `Dice roll result: ${result}`);
                boardContainer.appendChild(diceElement);

                const offsetX = (index - (diceCount - 1) / 2) * 60;
                diceElement.style.left = `calc(50% + ${offsetX}px)`;
                diceElement.style.top = "50%";

                setTimeout(() => {
                    diceElement.remove();
                }, 3000);
            });

            const diceLabel = diceType === 100 ? "d10%" : `d${diceType}`;
            const modifierText = modifier !== 0 ? (modifier > 0 ? ` +${modifier}` : ` ${modifier}`) : "";
            const resultText = `Rolled ${diceCount}${diceLabel}${modifierText}: ${results.join(", ")} (Total: ${total})`;

            rollHistory.unshift(resultText);
            if (rollHistory.length > 5) {
                rollHistory.pop();
            }
            diceResultTextarea.value = rollHistory.join("\n");
            saveBoardState();
        });

        function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            document.body.classList.add("fullscreen");
            toggleFullscreenButton.textContent = "Exit Full Screen";
            toggleFullscreenButtonFloating.textContent = "Exit Full Screen";
            const collapsibleSections = document.querySelectorAll(".collapsible-section");
            const panelContent = floatingPanel.querySelector(".panel-content");
            collapsibleSections.forEach(section => {
                panelContent.appendChild(section);
            });
            if (floatingPanel.classList.contains("collapsed")) {
                panelCollapsible.click();
            }
            floatingPanel.style.left = "10px";
            floatingPanel.style.top = "10px";
        });
    } else {
        document.exitFullscreen().then(() => {
            document.body.classList.remove("fullscreen");
            toggleFullscreenButton.textContent = "Full Screen";
            toggleFullscreenButtonFloating.textContent = "Full Screen";
            const sidePanel = document.querySelector(".side-panel");
            const collapsibleSections = document.querySelectorAll(".collapsible-section");
            collapsibleSections.forEach(section => {
                sidePanel.appendChild(section);
            });
            floatingPanel.style.left = "10px";
            floatingPanel.style.top = "10px";
        });
    }
}

        toggleFullscreenButton.addEventListener("click", toggleFullscreen);
        toggleFullscreenButtonFloating.addEventListener("click", toggleFullscreen);

        document.addEventListener("fullscreenchange", () => {
            if (!document.fullscreenElement) {
                document.body.classList.remove("fullscreen");
                toggleFullscreenButton.textContent = "Full Screen";
                toggleFullscreenButtonFloating.textContent = "Full Screen";
                const sidePanel = document.querySelector(".side-panel");
                const collapsibleSections = document.querySelectorAll(".collapsible-section");
                collapsibleSections.forEach(section => {
                    sidePanel.appendChild(section);
                });
                floatingPanel.style.left = "10px";
                floatingPanel.style.top = "10px";
            }
        });

        function saveBoardState() {
            const tokens = Array.from(document.querySelectorAll(".draggable-token")).map(token => ({
                src: token.src,
                baseLeft: token.dataset.baseLeft,
                baseTop: token.dataset.baseTop,
                size: token.classList.contains("gargantuan") ? "gargantuan" : token.classList.contains("huge") ? "huge" : token.classList.contains("large") ? "large" : "normal",
                flipped: token.classList.contains("flipped")
            }));
            const state = {
                tokens,
                selectedMap: mapSelect.value,
                selectedMusic: musicSelect.value,
                notes: notesTextarea.value,
                rollHistory
            };
            localStorage.setItem("boardState", JSON.stringify(state));
        }

        function loadBoardState() {
            const state = JSON.parse(localStorage.getItem("boardState"));
            if (!state) return;

            document.querySelectorAll(".draggable-token").forEach(el => el.remove());
            state.tokens.forEach(tokenData => {
                const newToken = document.createElement("img");
                newToken.src = tokenData.src;
                newToken.classList.add("draggable-token");
                if (tokenData.size === "large") newToken.classList.add("large");
                else if (tokenData.size === "huge") newToken.classList.add("huge");
                else if (tokenData.size === "gargantuan") newToken.classList.add("gargantuan");
                if (tokenData.flipped) newToken.classList.add("flipped");
                newToken.style.position = "absolute";
                const cellWidth = baseWidth / gridSize;
                const tokenSize = tokenData.size === "gargantuan" ? 4 : tokenData.size === "huge" ? 3 : tokenData.size === "large" ? 2 : 1;
                const tokenWidth = cellWidth * tokenSize;
                const adjustedLeft = tokenData.flipped ? parseFloat(tokenData.baseLeft) * zoomLevel + tokenWidth * zoomLevel : parseFloat(tokenData.baseLeft) * zoomLevel;
                newToken.style.left = `${adjustedLeft}px`;
                newToken.style.top = `${parseFloat(tokenData.baseTop) * zoomLevel}px`;
                newToken.dataset.baseLeft = tokenData.baseLeft;
                newToken.dataset.baseTop = tokenData.baseTop;
                newToken.style.width = `${tokenWidth}px`;
                newToken.style.height = `${tokenWidth}px`;
                newToken.style.transform = tokenData.flipped ? `scaleX(-1) scale(${zoomLevel})` : `scale(${zoomLevel})`;
                newToken.style.zIndex = "10";
                board.appendChild(newToken);
                setupTokenEvents(newToken);
            });

            if (state.selectedMap) {
                mapSelect.value = state.selectedMap;
                loadMap(state.selectedMap);
            }

            if (state.selectedMusic) {
                musicSelect.value = state.selectedMusic;
                const source = audioPlayer.querySelector("source");
                source.src = state.selectedMusic;
                audioPlayer.load();
                audioPlayer.play();
            }

            if (state.notes) {
                notesTextarea.value = state.notes;
            }

            if (state.rollHistory) {
                rollHistory = state.rollHistory;
                diceResultTextarea.value = rollHistory.join("\n");
            }
        }

        function exportBoardState() {
            const tokens = Array.from(document.querySelectorAll(".draggable-token")).map(token => ({
                src: token.src,
                baseLeft: token.dataset.baseLeft,
                baseTop: token.dataset.baseTop,
                size: token.classList.contains("gargantuan") ? "gargantuan" : token.classList.contains("huge") ? "huge" : token.classList.contains("large") ? "large" : "normal",
                flipped: token.classList.contains("flipped")
            }));
            const state = {
                tokens,
                selectedMap: mapSelect.value,
                notes: notesTextarea.value,
                rollHistory
            };
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
            const downloadAnchorNode = document.createElement("a");
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "board-state.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }

        function importBoardState(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const state = JSON.parse(e.target.result);

                    document.querySelectorAll(".draggable-token").forEach(el => el.remove());

                    state.tokens.forEach(tokenData => {
                        const newToken = document.createElement("img");
                        newToken.src = tokenData.src;
                        newToken.classList.add("draggable-token");
                        if (tokenData.size === "large") newToken.classList.add("large");
                        else if (tokenData.size === "huge") newToken.classList.add("huge");
                        else if (tokenData.size === "gargantuan") newToken.classList.add("gargantuan");
                        if (tokenData.flipped) newToken.classList.add("flipped");
                        newToken.style.position = "absolute";
                        const cellWidth = baseWidth / gridSize;
                        const tokenSize = tokenData.size === "gargantuan" ? 4 : tokenData.size === "huge" ? 3 : tokenData.size === "large" ? 2 : 1;
                        const tokenWidth = cellWidth * tokenSize;
                        const adjustedLeft = tokenData.flipped ? parseFloat(tokenData.baseLeft) * zoomLevel + tokenWidth * zoomLevel : parseFloat(tokenData.baseLeft) * zoomLevel;
                        newToken.style.left = `${adjustedLeft}px`;
                        newToken.style.top = `${parseFloat(tokenData.baseTop) * zoomLevel}px`;
                        newToken.dataset.baseLeft = tokenData.baseLeft;
                        newToken.dataset.baseTop = tokenData.baseTop;
                        newToken.style.width = `${tokenWidth}px`;
                        newToken.style.height = `${tokenWidth}px`;
                        newToken.style.transform = tokenData.flipped ? `scaleX(-1) scale(${zoomLevel})` : `scale(${zoomLevel})`;
                        newToken.style.zIndex = "10";
                        board.appendChild(newToken);
                        setupTokenEvents(newToken);
                    });

                    if (state.selectedMap) {
                        mapSelect.value = state.selectedMap;
                        loadMap(state.selectedMap);
                    }

                    if (state.notes) {
                        notesTextarea.value = state.notes;
                    }

                    if (state.rollHistory) {
                        rollHistory = state.rollHistory;
                        diceResultTextarea.value = state.rollHistory.join("\n");
                    }

                    saveBoardState();
                } catch (error) {
                    alert("Erro ao carregar o arquivo: " + error.message);
                }
            };
            reader.readAsText(file);
        }

        saveBoardButton.addEventListener("click", exportBoardState);
        saveBoardButtonFloating.addEventListener("click", exportBoardState);
        loadBoardInput.addEventListener("change", importBoardState);
        loadBoardInputFloating.addEventListener("change", importBoardState);

        loadBoardState();

        // Elementos do modal de ajuda
        const helpButton = document.getElementById("helpButton");
        const helpButtonFloating = document.getElementById("helpButtonFloating");
        const helpModal = document.getElementById("helpModal");
        const closeHelpModal = document.getElementById("closeHelpModal");

        function openHelpModal() {
            helpModal.style.display = "flex";
            const modalContent = helpModal.querySelector(".modal-content");
            modalContent.style.transform = "scale(0.7)";
            modalContent.style.opacity = "0";
            setTimeout(() => {
                modalContent.style.transition = "transform 0.3s ease, opacity 0.3s ease";
                modalContent.style.transform = "scale(1)";
                modalContent.style.opacity = "1";
            }, 10);
        }

        // Função para fechar o modal de ajuda
        function closeHelpModalFn() {
            const modalContent = helpModal.querySelector(".modal-content");
            modalContent.style.transform = "scale(0.7)";
            modalContent.style.opacity = "0";
            setTimeout(() => {
                helpModal.style.display = "none";
                modalContent.style.transition = "";
                modalContent.style.transform = "";
                modalContent.style.opacity = "";
            }, 300);
        }
        // Event listeners
        helpButton.addEventListener("click", openHelpModal);
        helpButtonFloating.addEventListener("click", openHelpModal);
        closeHelpModal.addEventListener("click", closeHelpModalFn);

        // Fechar o modal ao clicar fora do conteúdo
        helpModal.addEventListener("click", (e) => {
            if (e.target === helpModal) {
                closeHelpModalFn();
            }
        });