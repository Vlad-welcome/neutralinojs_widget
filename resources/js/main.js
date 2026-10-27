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
    if (e.button !== 0) return;

    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }

    isRepeating = true;
    picture.src = img[1];
    console.log("double");
  });

  // 5. Отключаем стандартное контекстное меню
  widget.addEventListener("contextmenu", (e) => {
    e.preventDefault();
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
});
