Neutralino.init();

Neutralino.events.on("ready", async () => {
  //   await Neutralino.window.setDraggableRegion("widget");
  const path = `${NL_PATH}/config.json`;
  const content = await Neutralino.filesystem.readFile(path);
  const config = JSON.parse(content);

  await Neutralino.window.setSize({ width: config.width, height: config.height });
  await Neutralino.window.setAlwaysOnTop(true);

  // Логика смены цвета остается на основном элементе
  const widget = document.getElementById("widget");
  const picture = document.getElementById("picture");

  let isDragging = false;
  let startX = 0;
  let startY = 0;

  // 1. Обработка нажатия кнопки мыши на виджете
  widget.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      e.preventDefault();
      isDragging = true;

      startX = e.screenX;
      startY = e.screenY;
      widget.style.cursor = "grabbing";
    }
  });

  // 2. Обработка движения мыши
  document.addEventListener("mousemove", async (e) => {
    if (!isDragging) return;

    // Вычисляем, насколько сдвинулся курсор с момента начала перетаскивания
    const deltaX = e.screenX - startX;
    const deltaY = e.screenY - startY;

    // Получаем текущую позицию окна, чтобы добавить к ней смещение
    try {
      const currentPos = await Neutralino.window.getPosition();
      // Перемещаем окно в новую позицию
      await Neutralino.window.move(currentPos.x + deltaX, currentPos.y + deltaY);

      // Обновляем начальную точку, так как окно уже сдвинулось
      startX = e.screenX;
      startY = e.screenY;
    } catch (err) {
      console.error("Ошибка при перемещении окна:", err);
    }
  });

  // 3. Обработка отпускания кнопки мыши
  document.addEventListener("mouseup", (e) => {
    if (e.button === 2 && isDragging) {
      isDragging = false;
      widget.style.cursor = "";
    }
  });

  await Neutralino.server.mount("/img", `${NL_PATH}/img`);

  const img = ["/img/img.png", "/img/img.gif"];
  console.log(img);

  let stopTimer = null;
  let isRepeating = false;

  picture.src = img[0];

  widget.addEventListener("click", (e) => {
    if (e.button !== 0) return;

    if (isRepeating) {
      isRepeating = false;
      picture.src = img[0];
      console.log("cancel");
      return;
    }

    if (stopTimer) return;

    picture.src = img[1];
    console.log("click");

    stopTimer = setTimeout(() => {
      picture.src = img[0];
      stopTimer = null;
      console.log("stop");
    }, config.ms);
  });

  widget.addEventListener("dblclick", (e) => {
    if (e.button === 0) {
      //включение зацикливание анимации
      console.log("double left");
      if (stopTimer) {
        clearTimeout(stopTimer);
        stopTimer = null;
      }

      isRepeating = true;
      picture.src = img[1];
    }
  });

  let lastRightClickTime = 0;
  let lastRightClickX = 0;
  let lastRightClickY = 0;

  const DOUBLE_CLICK_DELAY = 200; // мс между кликами
  const POSITION_TOLERANCE = 20; // пикселей

  // 5. Открытие VSCode
  widget.addEventListener("contextmenu", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    const dx = Math.abs(e.clientX - lastRightClickX);
    const dy = Math.abs(e.clientY - lastRightClickY);
    const isNearby = dx <= POSITION_TOLERANCE && dy <= POSITION_TOLERANCE;
    const isFast = now - lastRightClickTime <= DOUBLE_CLICK_DELAY;

    // === Сработал двойной правый клик ===
    if (isFast && isNearby) {
      lastRightClickTime = 0;
      console.log("double right");
      try {
        const folderPath = await Neutralino.os.showFolderDialog(
          "Выберите папку для открытия в VS Code",
        );
        if (folderPath) {
          // Папка выбрана, запускаем VS Code
          await Neutralino.os.execCommand(`code "${folderPath}"`, { background: true });
          console.log(`VS Code запущен для папки: ${folderPath}`);
        } else {
          console.log("Выбор папки отменён.");
        }
      } catch (error) {
        console.error("Ошибка при выборе папки или запуске VS Code:", error);
      }
    } else {
      lastRightClickTime = now;
      lastRightClickX = e.clientX;
      lastRightClickY = e.clientY;
    }
  });

  async function createTray() {
    const tray = {
      icon: "/resources/icons/trayIcon.png",
      menuItems: [
        { id: "SHOW", text: "Показать" },
        { id: "HIDE", text: "Убрать" },
        { id: "QUIT", text: "Закрыть" },
      ],
    };
    await Neutralino.os.setTray(tray);
  }
  await createTray();

  Neutralino.events.on("windowClose", () => {
    Neutralino.app.exit();
  });

  Neutralino.events.on("trayMenuItemClicked", (event) => {
    switch (event.detail.id) {
      case "SHOW":
        Neutralino.window.show();
        break;
      case "HIDE":
        Neutralino.window.hide();
        break;
      case "QUIT":
        Neutralino.app.exit();
        break;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      Neutralino.app.exit();
    }
  });

  Neutralino.events.on("serverOffline", () => {
    console.log("Server offline — closing app");
    Neutralino.app.exit();
  });
});
