/**
 * ELITE FIT — галерея: фильтры категорий и слайдер
 *
 * Этапы:
 * 1. Конфигурация наборов изображений по категориям
 * 2. Определение числа видимых фото и столбцов по ширине окна
 * 3. Построение барабана из столбцов с бесконечным циклом (клоны по краям)
 * 4. Переключение категорий и активной кнопки фильтра
 * 5. Сдвиг набора столбцов (6 / 4 / 1 картинок) с блокировкой повторных кликов
 * 6. Предзагрузка всех изображений в кэш браузера
 */

const GALLERY_SHIFT_DURATION_MS = 1100;
const GALLERY_SHIFT_EASING = 'cubic-bezier(0.33, 1, 0.68, 1)';
const GALLERY_BASE = 'assets/jpg';

function buildGalleryPaths(category, count) {
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    return `${GALLERY_BASE}/${category}/${category}-${number}.jpg`;
  });
}

const GALLERY_IMAGES = {
  gym: buildGalleryPaths('gym', 13),
  groups: buildGalleryPaths('groups', 13),
  studios: buildGalleryPaths('studios', 13),
};

GALLERY_IMAGES.all = [
  ...GALLERY_IMAGES.gym,
  ...GALLERY_IMAGES.groups,
  ...GALLERY_IMAGES.studios,
];

const ALT_BY_CATEGORY = {
  gym: 'Тренажёрный зал ELITE FIT',
  groups: 'Групповые занятия ELITE FIT',
  studios: 'Студия ELITE FIT',
  all: 'Фитнес-клуб ELITE FIT',
};

const preloadedImages = new Map();

function getVisibleCount() {
  const width = window.innerWidth;

  if (width >= 1024) {
    return 6;
  }

  if (width >= 768) {
    return 4;
  }

  return 1;
}

function getColumnCount() {
  const width = window.innerWidth;

  if (width >= 1024) {
    return 3;
  }

  if (width >= 768) {
    return 2;
  }

  return 1;
}

function mod(value, length) {
  return ((value % length) + length) % length;
}

function getAllGallerySources() {
  return [...new Set(Object.values(GALLERY_IMAGES).flat())];
}

function preloadImage(src) {
  if (preloadedImages.has(src)) {
    return preloadedImages.get(src);
  }

  const promise = new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';

    image.onload = () => {
      if (typeof image.decode === 'function') {
        image
          .decode()
          .then(() => resolve(image))
          .catch(() => resolve(image));
        return;
      }

      resolve(image);
    };

    image.onerror = () => resolve(null);
    image.src = src;
  });

  preloadedImages.set(src, promise);
  return promise;
}

function preloadAllGalleryImages() {
  return Promise.all(getAllGallerySources().map(preloadImage));
}

function bindImageReveal(container) {
  container.querySelectorAll('.gallery__item').forEach((item) => {
    const img = item.querySelector('img');
    if (!img) return;

    item.classList.remove('is-loaded');

    const reveal = () => item.classList.add('is-loaded');

    if (img.complete && img.naturalWidth > 0) {
      reveal();
      return;
    }

    img.addEventListener('load', reveal, { once: true });
    img.addEventListener('error', reveal, { once: true });
  });
}

class GallerySlider {
  constructor(section) {
    this.section = section;
    this.slider = section.querySelector('.gallery__slider');
    this.viewport = section.querySelector('.gallery__viewport');
    this.track = section.querySelector('.gallery__track');
    this.prevButton = section.querySelector('.gallery__control--prev');
    this.nextButton = section.querySelector('.gallery__control--next');
    this.filterButtons = section.querySelectorAll('.gallery__filter-btn');

    this.category = 'all';
    this.currentIndex = 0;
    this.totalRealColumns = 0;
    this.columnStep = 0;
    this.isAnimating = false;
    this.visibleCount = getVisibleCount();
    this.columnCount = getColumnCount();

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.prevButton.addEventListener('click', () => this.slide('prev'));
    this.nextButton.addEventListener('click', () => this.slide('next'));

    this.filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const category = button.dataset.category;

        if (!category || category === this.category || this.isAnimating) {
          return;
        }

        this.setCategory(category);
      });
    });

    this.track.addEventListener('transitionend', (event) => {
      if (event.target !== this.track || event.propertyName !== 'transform') {
        return;
      }

      this.finishTransition();
    });

    let resizeTimer;

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const nextVisibleCount = getVisibleCount();
        const nextColumnCount = getColumnCount();

        if (
          nextVisibleCount !== this.visibleCount ||
          nextColumnCount !== this.columnCount
        ) {
          this.visibleCount = nextVisibleCount;
          this.columnCount = nextColumnCount;
          this.render();
          return;
        }

        this.measure();
        this.updatePosition(false);
      }, 150);
    });
  }

  getImages() {
    return GALLERY_IMAGES[this.category] || GALLERY_IMAGES.all;
  }

  getAltText() {
    return ALT_BY_CATEGORY[this.category] || ALT_BY_CATEGORY.all;
  }

  buildAllColumns(images) {
    if (!images.length) {
      return [];
    }

    const rows = this.visibleCount / this.columnCount;
    const columns = [];
    const pageCount = Math.ceil(images.length / this.visibleCount);

    for (let page = 0; page < pageCount; page += 1) {
      const pageStart = page * this.visibleCount;

      for (let columnIndex = 0; columnIndex < this.columnCount; columnIndex += 1) {
        const columnImages = [];

        for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
          const slotIndex = rowIndex * this.columnCount + columnIndex;
          const imageIndex = pageStart + slotIndex;
          columnImages.push(images[imageIndex % images.length]);
        }

        columns.push(columnImages);
      }
    }

    return columns;
  }

  createColumnMarkup(images, columnIndex) {
    const alt = this.getAltText();
    const imagesMarkup = images
      .map(
        (src, imageIndex) =>
          `<div class="gallery__item"><img src="${src}" alt="${alt}" loading="eager" decoding="async"></div>`,
      )
      .join('');

    return `<div class="gallery__column">${imagesMarkup}</div>`;
  }

  render() {
    const images = this.getImages();
    const allColumns = this.buildAllColumns(images);

    if (!allColumns.length) {
      this.track.innerHTML = '';
      return;
    }

    this.totalRealColumns = allColumns.length;
    const cloneCount = this.getCloneCount();
    const extendedColumns = [
      ...allColumns.slice(-cloneCount),
      ...allColumns,
      ...allColumns.slice(0, cloneCount),
    ];

    this.currentIndex = cloneCount;
    this.isAnimating = false;
    this.slider.classList.remove('gallery__slider--animating');

    this.track.innerHTML = extendedColumns
      .map((columnImages) => this.createColumnMarkup(columnImages))
      .join('');

    bindImageReveal(this.track);
    this.measure();
    this.updatePosition(false);
  }

  measure() {
    const styles = window.getComputedStyle(this.track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
    const viewportWidth = this.viewport.clientWidth;
    const columnWidth =
      (viewportWidth - gap * (this.columnCount - 1)) / this.columnCount;

    this.viewport.style.setProperty('--gallery-column-width', `${columnWidth}px`);

    const columnElement = this.track.querySelector('.gallery__column');
    const actualColumnWidth = columnElement
      ? columnElement.getBoundingClientRect().width
      : columnWidth;

    this.columnStep = actualColumnWidth + gap;
  }

  updatePosition(animate) {
    const offset = this.currentIndex * this.columnStep;

    this.track.style.transition = animate
      ? `transform ${GALLERY_SHIFT_DURATION_MS}ms ${GALLERY_SHIFT_EASING}`
      : 'none';
    this.track.style.transform = `translate3d(-${offset}px, 0, 0)`;
  }

  getShiftStep() {
    return this.columnCount;
  }

  getCloneCount() {
    return this.columnCount + this.getShiftStep();
  }

  slide(direction) {
    if (this.isAnimating || this.totalRealColumns <= this.columnCount) {
      return;
    }

    this.isAnimating = true;
    this.slider.classList.add('gallery__slider--animating');

    const step = this.getShiftStep();

    if (direction === 'next') {
      this.currentIndex += step;
    } else {
      this.currentIndex -= step;
    }

    this.updatePosition(true);
  }

  finishTransition() {
    const cloneCount = this.getCloneCount();

    if (this.currentIndex >= cloneCount + this.totalRealColumns) {
      this.currentIndex =
        cloneCount + mod(this.currentIndex - cloneCount, this.totalRealColumns);
      this.updatePosition(false);
    } else if (this.currentIndex < cloneCount) {
      this.currentIndex =
        cloneCount + mod(this.currentIndex - cloneCount, this.totalRealColumns);
      this.updatePosition(false);
    }

    this.isAnimating = false;
    this.slider.classList.remove('gallery__slider--animating');
  }

  setCategory(category) {
    this.category = category;
    this.visibleCount = getVisibleCount();
    this.columnCount = getColumnCount();
    this.render();
    this.updateActiveFilter();
  }

  updateActiveFilter() {
    this.filterButtons.forEach((button) => {
      const isActive = button.dataset.category === this.category;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }
}

const galleryPreloadPromise = preloadAllGalleryImages();

document.addEventListener('DOMContentLoaded', () => {
  void initGallery();
});

async function initGallery() {
  const gallerySection = document.querySelector('.gallery');

  if (!gallerySection) {
    return;
  }

  await galleryPreloadPromise;

  const slider = new GallerySlider(gallerySection);
  slider.updateActiveFilter();
}
