window.onload = function(){
    document.getElementById('upload').addEventListener('change', function(event) {
        const file = event.target.files[0]; // 最初のファイルを取得
        if (file && file instanceof Blob) { 
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    handleImageLoad(img);
                }
                img.src = e.target.result;
            }
            reader.readAsDataURL(file); 
        } else {
            console.error('選択されたファイルが無効です。');
        }
    });
};

/*
document.getElementById('loadImage').addEventListener('change', function() {
    const fileInput = document.getElementById('loadImage');
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            cv.imshow('canvas0', cv.imread(img));
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
});

document.getElementById('testBrightness').addEventListener('click', function() {
    const mat = getImageMatrix('canvas0');
    const brightness = estimateBrightness(mat);
    alert(`明度: ${brightness.toFixed(2)}`);
    mat.delete();
});

document.getElementById('testColorTemperature').addEventListener('click', function() {
    const mat = getImageMatrix('canvas0');
    const kelvin = estimateColorTemperature(mat);
    alert(`色温度: ${kelvin.toFixed(0)}K`);
    mat.delete();
});

document.getElementById('testHistogram').addEventListener('click', function() {
    const mat = getImageMatrix('canvas0');
    plotHistogram(mat);
    mat.delete();
});

document.getElementById('convertToHSV').addEventListener('click', function() { // HSV化ボタンのイベントリスナー
    const mat = getImageMatrix('canvas0');
    const hsv = new cv.Mat();
    cv.cvtColor(mat, hsv, cv.COLOR_RGBA2RGB);
    cv.cvtColor(hsv, hsv, cv.COLOR_BGR2HSV);
    cv.imshow('canvas2', hsv); // canvas2にHSV画像を表示
    mat.delete();
    hsv.delete();
});
*/

function handleImageLoad(img) {
    const status = document.querySelector('#status');
    status.innerHTML = "";

    const images = processImage(img);
    if (images.length != 2) {
        status.innerHTML = "画像読み込みエラー。";
        return;
    }
    const emptyMat = new cv.Mat(480, 1280, cv.CV_8UC4, new cv.Scalar(255, 255, 255, 255)); // 白い空白の画像を作成
    cv.imshow(`canvas1`, emptyMat); // 空白をcanvas1に表示
    const left = images[1];
    const right = images[0];
    const rectTopLeft = new cv.Point(0, 0);
    const rectBottomRight = new cv.Point(450, 30);
    // const rectTopLeft = new cv.Point(0, left.rows - 30);
    // const rectBottomRight = new cv.Point(450, left.rows);
    // const pnt = new cv.Point(10, right.rows - 10);
    const pnt = new cv.Point(10, 20);
    let strLeft = "";
    let strRight = "";

    if (left) {
        const brightness = estimateBrightness(left);
        const kelvin = estimateColorTemperature(left);
        strLeft = `Brightness: ${brightness.toFixed(2)}, Color Temperature: ${kelvin.toFixed(0)}K`;
        cv.rectangle(left, rectTopLeft, rectBottomRight, new cv.Scalar(0, 0, 0, 255), -1); // 半透明に設定
        cv.putText(left, strLeft, pnt, cv.FONT_HERSHEY_SIMPLEX, 0.6, new cv.Scalar(255, 255, 255, 255), 1, cv.LINE_AA);
    }
    if (right) {
        const brightness = estimateBrightness(right);
        const kelvin = estimateColorTemperature(right);
        strRight = `Brightness: ${brightness.toFixed(2)}, Color Temperature: ${kelvin.toFixed(0)}K`;
        cv.rectangle(right, rectTopLeft, rectBottomRight, new cv.Scalar(0, 0, 0, 255), -1); // 半透明に設定
        cv.putText(right, strRight, pnt, cv.FONT_HERSHEY_SIMPLEX, 0.6, new cv.Scalar(255, 255, 255, 255), 1, cv.LINE_AA);
    }
    const hist1 = createHistogram(left);
    const hist2 = createHistogram(right);

    cv.resize(right, right, new cv.Size(right.cols, left.rows)); // rightの高さをleftに合わせてリサイズ
    const combined = new cv.Mat();
    let matVector = new cv.MatVector();
    matVector.push_back(left);
    matVector.push_back(right);
    cv.hconcat(matVector, combined); // 左右の画像を結合
    cv.imshow(`canvas1`, combined); // 結合した画像をcanvas1に表示

    matVector = new cv.MatVector();
    matVector.push_back(hist1);
    matVector.push_back(hist2);
    cv.hconcat(matVector, combined); // 左右の画像を結合
    cv.imshow(`canvas2`, combined); // 結合した画像をcanvas1に表示

    emptyMat.delete(); matVector.delete(); combined.delete();
    left.delete();
    right.delete();
    status.innerHTML = `左:${strLeft}<br>右:${strRight}`;
}

function processImage(image) {
    const mat = cv.imread(image);
    const output = mat.clone();
    let col_gray = [28, 28, 28];
    let col_green = [0, 255, 0];
    let mat_low_white = new cv.Mat(mat.rows, mat.cols, mat.type(), new cv.Scalar(200, 200, 200, 0));
    let mat_high_white = new cv.Mat(mat.rows, mat.cols, mat.type(), new cv.Scalar(255, 255, 255, 255));
    let mat_low_gray = new cv.Mat(mat.rows, mat.cols, mat.type(), new cv.Scalar(28, 28, 28, 0));
    let mat_high_gray = new cv.Mat(mat.rows, mat.cols, mat.type(), new cv.Scalar(28, 28, 28, 255));
    
    // const mask = new cv.Mat();
    // const distMat = new cv.Mat();
    // cv.inRange(output, mat_low_gray, mat_high_gray, mask);
    replaceColor(mat, mat_low_white, mat_high_white, col_gray);
    replaceColor(mat, mat_low_gray, mat_high_gray, col_green);
    
    const gray = new cv.Mat();
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
    const thresh = new cv.Mat();
    cv.threshold(gray, thresh, 25, 255, cv.THRESH_BINARY_INV);
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(20, 20));
    const closed = new cv.Mat();
    cv.morphologyEx(thresh, closed, cv.MORPH_CLOSE, kernel);
    cv.threshold(closed, thresh, 127, 255, cv.THRESH_BINARY);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let images = [];
    for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const rect = cv.boundingRect(cnt);
        const aspectRatio = rect.width / rect.height;
        if (rect.width < 300 || Math.abs(aspectRatio - (4 / 3)) > 0.1) {
            continue;
        }
        const cropped = output.roi(rect).clone();
        images.push(cropped);
    }

    mat.delete(); output.delete(); gray.delete(); thresh.delete(); closed.delete(); hierarchy.delete(); contours.delete();
    return images;
}

function replaceColor(cimg, lowerBound, upperBound, newColor) {
    const mask = new cv.Mat();
    cv.inRange(cimg, lowerBound, upperBound, mask);
    let colorImage = new cv.Mat(cimg.rows, cimg.cols, cimg.type(), new cv.Scalar(newColor[0], newColor[1], newColor[2]));

    for (let i = 0; i < mask.rows; i++) {
        for (let j = 0; j < mask.cols; j++) {
            if (mask.ucharPtr(i, j)[0] > 0) {
                cimg.ucharPtr(i, j)[0] = colorImage.ucharPtr(i, j)[0];
                cimg.ucharPtr(i, j)[1] = colorImage.ucharPtr(i, j)[1];
                cimg.ucharPtr(i, j)[2] = colorImage.ucharPtr(i, j)[2];
            }
        }
    }

    mask.delete();
    colorImage.delete();
}

function estimateBrightness(image) {
    if (image.empty()) {
        return 0;
    }
    const hsv = new cv.Mat();
    // const i = new cv.Mat();
    // const bgr = new cv.Mat();
    // cv.cvtColor(image, i, cv.COLOR_RGBA2RGB);
    // cv.imshow(`canvas3`, i);
    // cv.cvtColor(i, bgr, cv.COLOR_RGB2BGR);
    // cv.imshow(`canvas4`, bgr);
    cv.cvtColor(image, hsv, cv.COLOR_BGR2HSV);
    // cv.imshow(`canvas5`, hsv);
    // cv.cvtColor(bgr, hsv, cv.COLOR_BGR2HSV);
    // cv.imshow(`canvas6`, hsv);
    // cv.cvtColor(i, hsv, cv.COLOR_BGR2HSV);
    // cv.imshow(`canvas7`, hsv);
    let v = new cv.MatVector();
    cv.split(hsv, v);
    let brightnessMat = v.get(2);  // Vチャンネル
    let mean = cv.mean(brightnessMat)[0];
    if (!mean) {
        return 0;
    }
    const brightness = mean;
    hsv.delete(); brightnessMat.delete();
    return brightness !== undefined ? brightness : 0;
}

function estimateColorTemperature(image) {
    const avgColor = cv.mean(image);
    const r = avgColor[0];
    const g = avgColor[1];
    const b = avgColor[2];
    if (r === g && g === b) {
        return 6500;
    }
    const kelvin = 1000 + (r - b) * 40;
    return Math.max(10, Math.min(kelvin, 10000));
}

function createHistogram(src) {
    if (src.empty()) {
        return;
    }
    const hsv = new cv.Mat();
    cv.cvtColor(src, hsv, cv.COLOR_RGBA2GRAY, 0);
    const channels = [0];
    const histSize = [256];
    const ranges = [0, 266];
    const matVector = new cv.MatVector();
    matVector.push_back(hsv);
    const hist = new cv.Mat();
    const mask = new cv.Mat();
    let color = new cv.Scalar(0, 0, 0);
    let scale = 2;
    try {
        cv.calcHist(matVector, channels, mask, hist, histSize, ranges);
        let result = cv.minMaxLoc(hist, mask);
        let max = result.maxVal;
        let dst = new cv.Mat.ones(src.rows, histSize[0] * scale,
                                   cv.CV_8UC3);
        // draw histogram
        for (let i = 0; i < histSize[0]; i++) {
            let binVal = hist.data32F[i] * src.rows / max;
            let point1 = new cv.Point(i * scale, src.rows - 1);
            let point2 = new cv.Point((i + 1) * scale - 1, src.rows - binVal);
            cv.rectangle(dst, point1, point2, color, cv.FILLED);
        }
    } catch (err) {
        console.error("ヒストグラム計算中にエラー！", err);
    } finally {
        hsv.delete();
        hist.delete();
        mask.delete();
        matVector.delete();
    }

    return dst;
}

function getImageMatrix(canvasId) {
    const canvas = document.getElementById(canvasId);
    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    return cv.matFromImageData(imageData);
}