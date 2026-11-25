document.addEventListener('DOMContentLoaded', function() {
    // Initialize EmailJS with your public key
    let emailReady = false;
    try {
        if (window.emailjs) {
            emailjs.init('gO9gUVHiJYer7EotG'); // EmailJS public browser key, not a secret.
            emailReady = true;
        }
    } catch (_) { /* Forms will offer direct contact; navigation stays usable. */ }

    const root = document.documentElement;
    root.classList.add('js');
    const header = document.querySelector('.header');
    const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : (cb => setTimeout(cb, 16));

    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    const mobileMenu = window.matchMedia('(max-width: 768px)');
    function setMenu(open) {
        const expanded = mobileMenu.matches && open;
        hamburger.classList.toggle('active', expanded);
        navMenu.classList.toggle('active', expanded);
        header.classList.toggle('menu-open', expanded);
        hamburger.setAttribute('aria-expanded', String(expanded));
        hamburger.setAttribute('aria-label', expanded ? 'Close navigation menu' : 'Open navigation menu');
        navMenu.hidden = mobileMenu.matches && !expanded;
        document.body.style.overflow = expanded ? 'hidden' : '';
    }
    setMenu(false);
    mobileMenu.addEventListener('change', () => setMenu(false));
    hamburger.addEventListener('click', () => setMenu(!navMenu.classList.contains('active')));

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', function() {
            setMenu(false);
        });
    });

    // Smooth scrolling for in-page links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const id = this.getAttribute('href');
            if (id === '#') return;
            const target = document.querySelector(id);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
                if (history.replaceState) history.replaceState(null, '', id);
            }
        });
    });

    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // Booking form validation and handling
    const bookingForm = document.getElementById('bookingForm');
    const checkinInput = document.getElementById('checkin');
    const checkoutInput = document.getElementById('checkout');

    // Set minimum date to today
    const now = new Date();
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    checkinInput.min = today;
    checkoutInput.min = today;

    // Update checkout minimum date when checkin changes
    checkinInput.addEventListener('change', function() {
        const checkinDate = new Date(this.value);
        if (!Number.isFinite(checkinDate.getTime())) {
            checkoutInput.min = today;
            return;
        }
        checkinDate.setUTCDate(checkinDate.getUTCDate() + 1); // Calendar day, independent of daylight-saving changes.
        checkoutInput.min = checkinDate.toISOString().split('T')[0];
        
        // Clear checkout if it's before new minimum
        if (checkoutInput.value && new Date(checkoutInput.value) <= new Date(this.value)) {
            checkoutInput.value = '';
        }
    });

    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn.disabled) return;
        const status = document.getElementById('bookingStatus');
        const formData = new FormData(this);
        const guestName = (formData.get('name') || '').trim();
        const guestEmail = (formData.get('email') || '').trim();
        const guestPhone = (formData.get('phone') || '').trim();
        const checkin = formData.get('checkin');
        const checkout = formData.get('checkout');
        const checkinDate = new Date(checkin);
        const checkoutDate = new Date(checkout);
        const adults = formData.get('adults');
        const children = formData.get('children');
        const crib = formData.get('crib') ? 'Yes' : 'No';
        if (!this.checkValidity() || !Number.isFinite(checkinDate.getTime()) || !Number.isFinite(checkoutDate.getTime()) || checkin < today || checkoutDate <= checkinDate) {
            status.textContent = 'Your request was not sent. Complete the required details, choose a check-in date of today or later, and a check-out date after check-in.';
            return;
        }
        const nights = Math.round((checkoutDate - checkinDate) / 86400000);
        const bookingSummary = [
            'Availability request:',
            `Name: ${guestName}`,
            `Email: ${guestEmail}`,
            `Phone: ${guestPhone}`,
            `Check-in: ${checkin}`,
            `Check-out: ${checkout}`,
            `Nights: ${nights}`,
            `Adults: ${adults}`,
            `Children: ${children}`,
            `Crib requested: ${crib}`,
            'Please confirm availability and pricing.'
        ].join('\n');
        const templateParams = {
            checkin,
            checkout,
            nights, adults, children, crib,
            from_name: guestName,
            from_email: guestEmail,
            phone: guestPhone
        };
        const originalText = submitBtn.textContent;
        status.textContent = 'Sending your availability request...';
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        Promise.resolve().then(() => {
            if (!emailReady) throw new Error('Email service unavailable');
            return emailjs.send('service_zov0yer', 'template_y5stmvv', templateParams);
        }).then(() => {
            status.textContent = 'Your request was sent. Dates and prices still require host confirmation; this is not a confirmed reservation.';
            bookingForm.reset();
        }).catch(() => {
            status.textContent = 'Your request was not sent. Your details are still here. Please try again, or choose to send your request on WhatsApp: ';
            const link = document.createElement('a');
            link.href = 'https://wa.me/972559953030?text=' + encodeURIComponent(bookingSummary);
            link.textContent = 'Open WhatsApp with your request';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            status.append(link);
        }).finally(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    });

    // Contact form handling
    const contactForm = document.getElementById('contactForm');
    
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const name = formData.get('name');
        const email = formData.get('email');
        const phone = formData.get('phone');
        const message = formData.get('message');
        const status = document.getElementById('contactStatus');

        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        status.textContent = 'Sending your message...';
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        // Prepare template parameters for EmailJS
        const templateParams = {
            from_name: name,
            from_email: email,
            phone: phone || 'Not provided',
            message: message
        };

        // Send email via EmailJS
        Promise.resolve().then(() => {
            if (!emailReady) throw new Error('Email service unavailable');
            return emailjs.send('service_zov0yer', 'template_mzckjrc', templateParams);
        })
            .then(function(response) {
                console.log('Contact email sent successfully:', response.status, response.text);
                
                // Show success message
                status.textContent = 'Your message was sent. We will reply to your inquiry.';
                
                // Reset form
                contactForm.reset();
            })
            .catch(function(error) {
                console.error('Failed to send contact email:', error);
                
                status.textContent = 'Your message was not sent. Your details are still here. Please try again or contact us directly: ';
                const emailLink = document.createElement('a');
                emailLink.href = 'mailto:ramot-getaway@cohen.network';
                emailLink.textContent = 'Email us';
                const whatsappLink = document.createElement('a');
                whatsappLink.href = 'https://wa.me/972559953030';
                whatsappLink.textContent = 'Message us on WhatsApp';
                whatsappLink.target = '_blank';
                whatsappLink.rel = 'noopener noreferrer';
                status.append(emailLink, ' or ', whatsappLink);
            })
            .finally(function() {
                // Reset button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
    });

    // Scroll-driven effects: header state, progress bar, floating WhatsApp, parallax
    const whatsappFloat = document.getElementById('whatsappFloat');
    const progress = document.getElementById('scrollProgress');
    const heroContent = document.querySelector('[data-parallax-fade]');
    const parallaxLayers = reduceMotion ? [] : [...document.querySelectorAll('[data-parallax]')];
    const parallaxImages = reduceMotion ? [] : [...document.querySelectorAll('[data-parallax-img]')];
    let ticking = false;

    function updateOnScroll() {
        ticking = false;
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const vh = window.innerHeight || 1;

        header.classList.toggle('scrolled', scrollY > 40);
        whatsappFloat.classList.toggle('show', scrollY > 500);

        if (progress) {
            const max = (document.documentElement.scrollHeight - vh) || 1;
            progress.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / max))})`;
        }

        // Layers move relative to their (untransformed) parent as it crosses the viewport
        parallaxLayers.forEach(layer => {
            const box = layer.parentElement.getBoundingClientRect();
            if (box.bottom < -100 || box.top > vh + 100) return;
            const speed = parseFloat(layer.dataset.parallax) || 0;
            const offset = (box.top + box.height / 2 - vh / 2) * -speed;
            layer.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
        });

        // Gallery photos drift gently inside their frames
        parallaxImages.forEach(img => {
            const box = img.parentElement.getBoundingClientRect();
            if (box.bottom < 0 || box.top > vh) return;
            const progressIn = (box.top + box.height / 2 - vh / 2) / vh; // roughly -0.5 … 0.5
            img.style.transform = `translate3d(0, ${(progressIn * -box.height * 0.12).toFixed(1)}px, 0)`;
        });

        // Hero copy lifts and fades as you scroll away
        if (heroContent && !reduceMotion) {
            const t = Math.min(1, scrollY / (vh * 0.8));
            heroContent.style.transform = `translate3d(0, ${(t * -60).toFixed(1)}px, 0)`;
            heroContent.style.opacity = String(1 - t * 0.9);
        }
    }

    function requestUpdate() {
        if (!ticking) {
            ticking = true;
            raf(updateOnScroll);
        }
    }
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    updateOnScroll();

    // Reveal on scroll
    const revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !reduceMotion) {
        const revealObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        revealEls.forEach(el => revealObserver.observe(el));
    } else {
        revealEls.forEach(el => el.classList.add('is-visible'));
    }

    // Gallery lightbox
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const caption = document.getElementById('caption');
    const close = modal.querySelector('.close');
    const galleryItems = [...document.querySelectorAll('.gallery-item')];
    let currentIndex = 0;
    let lastFocus = null;

    function showImage(index) {
        currentIndex = (index + galleryItems.length) % galleryItems.length;
        const img = galleryItems[currentIndex].querySelector('img');
        modalImg.src = img.getAttribute('src');
        modalImg.alt = img.alt;
        caption.textContent = img.alt;
    }
    function openModal(index) {
        lastFocus = document.activeElement;
        showImage(index);
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        close.focus();
    }
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    galleryItems.forEach((item, i) => item.addEventListener('click', () => openModal(i)));
    close.addEventListener('click', closeModal);
    modal.querySelector('.modal-prev').addEventListener('click', () => showImage(currentIndex - 1));
    modal.querySelector('.modal-next').addEventListener('click', () => showImage(currentIndex + 1));
    modal.addEventListener('click', e => {
        if (e.target === modal || e.target.classList.contains('modal-figure')) closeModal();
    });

    // Reviews carousel buttons
    const reviewsTrack = document.getElementById('reviewsGrid');
    const prevBtn = document.getElementById('reviewsPrev');
    const nextBtn = document.getElementById('reviewsNext');
    function scrollReviews(direction) {
        const card = reviewsTrack.querySelector('.review-card');
        const step = card ? card.getBoundingClientRect().width + 20 : 320;
        if (reviewsTrack.scrollBy) reviewsTrack.scrollBy({ left: direction * step, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    function updateReviewButtons() {
        const max = reviewsTrack.scrollWidth - reviewsTrack.clientWidth - 4;
        prevBtn.disabled = reviewsTrack.scrollLeft <= 4;
        nextBtn.disabled = max > 0 && reviewsTrack.scrollLeft >= max;
    }
    prevBtn.addEventListener('click', () => scrollReviews(-1));
    nextBtn.addEventListener('click', () => scrollReviews(1));
    reviewsTrack.addEventListener('scroll', () => raf(updateReviewButtons), { passive: true });

    // ---------------------------------------------------------------------
    // Reviews
    // ---------------------------------------------------------------------
    const AIRBNB_REVIEWS_URL = 'https://www.airbnb.com/rooms/615293478807650528/reviews';

    // Every 4- and 5-star review on the Airbnb listing, newest first, as written by the guest.
    // To add one: put a new line at the top with the guest's name, stars, month and text.
    const AIRBNB_REVIEWS = [
        ['Lisa', 5, 'November 2026', 'My husband and I have stayed at this location 4 times now. Avremey lives nearby and is always easy to communicate with. The location is nearby to parks, shopping and shuls. The apartment is always clean and with the right amenities provided. A/C and heat work well.'],
        ['Amiella', 5, 'August 2026', 'I stayed for a month, despite a lot of other reviews saying space it too small for a longer stay I think it was just fine with two people. The space was clean and Avremy responded quickly to any questions/concerns and was very kind and welcoming.'],
        ['Erin', 5, 'January 2026', 'Avremy was very helpful with a small issue and addressed it immediately. The apartment was perfect for our needs and met all our expectations.'],
        ['Shmuel', 5, 'November 2025', 'Great host clean place.'],
        ['Daniel', 4, 'October 2025', 'Avremy was helpful and responded quickly to any questions. He was friendly and easy to deal with. The flat was very clean and it was great to have own entrance etc. Aircon very effective and a new fridge/freezer.'],
        ['Madeline', 4, 'September 2025', 'Avremy’s place was perfect for what we needed it for, a quick stopover, motzei shabbos before we flew home through Ben Gurion. Thank you to Avremy for your hospitality.'],
        ['Stephen', 5, 'September 2025', 'Avremy was helpful as we had to make last minute adjustments on the reantal'],
        ['David', 5, 'August 2025', 'My wife and I genuinely enjoyed our two-week stay at Avremy\'s apartment in Bet Shemesh Aleph. We were encouraged by the photos, which initially left us a bit surprised when it turned out to be somewhat smaller than we expected. However, once we settled in, unpacked and started living there, we began regarding it as "cozy comfy," just big enough to meet all our needs in a charming and comfortable way. The apartment is very modern, and it is designed to maximize every square inch of space. The end result was an apartment where we quickly felt at home and would unquestionably stay at again. Not to be overlooked is its location, which is in the middle of a lovely, tree-filled neighborhood, walking distance to abundant shopping. The apartment itself was very quiet, with a very comfortable bed and pillows. All in all, highly recommended for two people looking for a sweet place from which to enjoy Bet Shemesh!'],
        ['David', 5, 'July 2025', 'Great host and nice place to stay.'],
        ['David', 5, 'June 2025', 'Recommend this place .'],
        ['אוריאל', 5, 'May 2025', 'Avrahami was very accessible and available, courteous and creative.', true],
        ['Merril', 5, 'April 2025', 'This was quite a find as the apartment was clean, had a washer/dryer, good sunlight, near several parks, walking distance to Dolev and the Mercaz, was on the ground floor and allows for pets!\nAlso, the host was very responsive even though he was traveling!'],
        ['Lisa', 5, 'February 2025', 'This is our 4th time staying at this location. The hosts are kind and thoughtful. This ground level apartment is a modest size but it is quite perfect for a couple. All appliances and accommodations worked well. The bathroom is always clean, and the refrigerator is a perfect size. The split mattress bed is comfortable with plenty of warm blankets. A washer and dryer is available on site. There is shopping and bus stops close by. Avremy has always worked well with us whether it be months out or last minute.'],
        ['Libby', 5, 'November 2024', 'The location was good. A few minutes drive to grocery stores, and parks within walking distance. We liked that it was a quiet and private neighborhood and on the ground flood. We also really appreciated having parking right in front. Avrumy was very responsive and checked in with us during the stay to make sure we had what we needed. He was also extremely gracious about allowing us a late checkout, which was so helpful with a baby. Our only complaint was that the apartment didn\'t appear to have been cleaned before our stay - hair and dirt on the floor etc. But overall the experience was positive, and the apartment worked for us.'],
        ['Diane', 5, 'September 2024', 'Avremy was a very helpful host with all our requests\nThe place was conveniently located for our Shabbat in RBS and the place was very clean and well maintained\nWould definitely stay again'],
        ['Daniel', 5, 'August 2024', 'The host is very nice and friendly.\nThe apartment is nice and comfortable, the area is quiet and private.\nWe enjoyed ourselves very much.\nThank you :)'],
        ['Carol', 4, 'August 2024', 'This lovely little apartment is a real gem.  It is in a very convenient location and unusual for its size in that it has a separate bedroom. All the other 2 person occupancy apartments in the area we checked out are studios.'],
        ['Moseh', 5, 'July 2024', 'Constant response, Hapoel did not go to the place due to family joy and we got on another right on Shabbat. Thank you', true],
        ['Monica', 5, 'June 2024', 'The place is small but very well equipped. It’s has a private entrance and location is well located in the town. The host was responsive and helpful. Overall it served well for 2 people.'],
        ['Lisa', 5, 'December 2023', 'We have stayed here before and were glad it was available for our visit. It is neat and clean and has everything we needed and is centrally located to shopping and restaurants. We will probably stay here again if available for future visits.'],
        ['Susana', 5, 'December 2023', 'We had a very nice stay. We enjoyed the beach and restaurants in the area. Minimarket open 24/7. Very friendly building staff. We felt at home. We would like to return in summer', true],
        ['Jerry', 5, 'October 2023', 'This is the second time we stayed in this AirBnb.   The hosts checked in with us periodically to ensure that everything was ok.   We felt very comfortable in the apartment.   The location is close to several bus lines, and in walking distance of several grocery stores, both large and small.'],
        ['Lee', 5, 'August 2023', 'We’re picky people but have no complaints after staying here. It fit our needs perfectly.'],
        ['Miri', 5, 'July 2023', 'Our stay in RAMAT BEIT SHEMESH א was very peaceful.  It’s an ideal place for two people.'],
        ['Rephoel', 5, 'July 2023', 'We will be back!'],
        ['Quint Thibault', 5, 'May 2023', 'A very nice and helpful host. The apartment has corresponded to the specifications. There is a very uncomplicated access to the apartment (You have your own access at the house.) In front of the building is always some parking space free. The people on site are all very nice.'],
        ['Rebecca', 5, 'February 2023', 'My good friends stayed here for two nights to be close to family for a bar mitzvah. It was perfect: walking distance on Shabat but still their own space. Quiet and clean. Good heating for the very cold weather we had.'],
        ['Jerry', 5, 'October 2022', 'This apartment is clean, comfortable, and in a good location.  We would recommend it to others.'],
        ['Romy', 5, 'September 2022', 'It was a perfect stay.Super clean,excellent shower and appliances a/c and had everything we needed.Centrally located,beautifully  decorated and most of all very helpful host.Avremy was always there for anything we needed. Without a doubt I would recommend this rental to family and friends in the future.Thank you!'],
        ['Shoshana', 5, 'September 2022', 'Cosy and clean, close to everything'],
        ['Shana', 5, 'June 2022', 'Accommodation was great - perfect for what we needed. Small and compact, good AC, great location. Avremi was very helpful and friendly. I\'m sure we\'ll be back again in the future. Would highly recommend this apartment.']
    ];

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    // Builds one review card. Everything is set with textContent, so review text can never inject markup.
    function buildReviewCard({ name, rating, text, date, sourceLabel, sourceUrl, sourceLinkText, nameUrl, note, variant }) {
        const card = el('div', 'review-card' + (variant ? ` review-card--${variant}` : ''));
        const source = el('p', 'review-source', sourceLabel + ' · ');
        const link = el('a', null, sourceLinkText);
        link.href = sourceUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        source.appendChild(link);

        const stars = el('div', 'review-stars', '★'.repeat(rating) + '☆'.repeat(5 - rating));
        stars.setAttribute('aria-label', `${rating} out of 5 stars`);

        const body = el('p', 'review-text', `"${text.trim()}"`);
        const author = el('div', 'review-author');
        const who = el('strong', null, nameUrl ? null : name);
        if (nameUrl) {
            const a = el('a', null, name);
            a.href = nameUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            who.appendChild(a);
        }
        author.append(who, el('span', 'review-date', date));

        card.append(source, stars, body);
        if (note) card.appendChild(el('p', 'review-note', note));
        card.appendChild(author);
        return card;
    }

    // Long reviews are clamped with a "Read more" toggle
    function addReadMore(card) {
        const body = card.querySelector('.review-text');
        if (body.textContent.length < 260) return;
        body.classList.add('is-clamped');
        const toggle = el('button', 'review-more', 'Read more');
        toggle.type = 'button';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.addEventListener('click', () => {
            const open = body.classList.toggle('is-clamped') === false;
            toggle.textContent = open ? 'Show less' : 'Read more';
            toggle.setAttribute('aria-expanded', String(open));
        });
        body.after(toggle);
    }

    // Kept for adding a review by hand from the console or another script
    window.addReview = function(name, rating, text, date, translated) {
        const card = buildReviewCard({
            name, rating, text, date,
            sourceLabel: 'Airbnb review',
            sourceUrl: AIRBNB_REVIEWS_URL,
            sourceLinkText: 'View on Airbnb',
            note: translated ? 'Translated from Hebrew by Airbnb' : null
        });
        reviewsTrack.appendChild(card);
        addReadMore(card);
        return card;
    };

    AIRBNB_REVIEWS.forEach(([name, rating, date, text, translated]) => addReview(name, rating, text, date, translated));

    // ---------------------------------------------------------------------
    // Live Google reviews (Google Maps JavaScript API, Places library)
    // Fill in both values to switch it on. The key must be restricted in Google Cloud
    // to the website ramot-getaway.cohen.network/* and to the Maps JavaScript API +
    // Places API (New). Google's terms don't allow storing review content, so reviews
    // are fetched fresh, and only once a visitor scrolls near the reviews section.
    // ---------------------------------------------------------------------
    const GOOGLE_MAPS_API_KEY = '';
    const GOOGLE_PLACE_ID = '';
    const GOOGLE_MIN_STARS = 4;

    const googleSummary = document.getElementById('googleSummary');

    function loadGoogleMaps() {
        if (window.google && window.google.maps && window.google.maps.importLibrary) return Promise.resolve();
        return new Promise((resolve, reject) => {
            window.__ramotGoogleReady = resolve;
            const s = document.createElement('script');
            s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(GOOGLE_MAPS_API_KEY) +
                '&v=weekly&language=en&loading=async&callback=__ramotGoogleReady';
            s.async = true;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    async function showGoogleReviews() {
        try {
            await loadGoogleMaps();
            const { Place } = await google.maps.importLibrary('places');
            const place = new Place({ id: GOOGLE_PLACE_ID, requestedLanguage: 'en' });
            await place.fetchFields({ fields: ['rating', 'userRatingCount', 'reviews', 'googleMapsURI'] });

            const mapsUrl = place.googleMapsURI || 'https://g.page/r/CYj-CBXM5f_1EAI';
            const reviews = (place.reviews || []).filter(r => (r.rating || 0) >= GOOGLE_MIN_STARS && r.text);

            const anchor = reviewsTrack.firstElementChild;
            reviews.forEach(r => {
                const author = r.authorAttribution || {};
                const card = buildReviewCard({
                    name: author.displayName || 'Google user',
                    nameUrl: author.uri || null,
                    rating: Math.round(r.rating),
                    text: r.text,
                    date: r.relativePublishTimeDescription || '',
                    sourceLabel: 'Google review',
                    sourceUrl: mapsUrl,
                    sourceLinkText: 'View on Google Maps',
                    variant: 'google'
                });
                reviewsTrack.insertBefore(card, anchor);
                addReadMore(card);
            });

            if (googleSummary && place.rating) {
                googleSummary.querySelector('[data-g="rating"]').textContent = place.rating.toFixed(1);
                googleSummary.querySelector('[data-g="count"]').textContent =
                    `${place.userRatingCount} Google review${place.userRatingCount === 1 ? '' : 's'}`;
                googleSummary.querySelector('a').href = mapsUrl;
                googleSummary.hidden = false;
            }
            reviewsTrack.scrollLeft = 0;
            updateReviewButtons();
        } catch (err) {
            // The Airbnb reviews stay on the page either way
            if (window.console) console.warn('Google reviews could not be loaded', err);
        }
    }

    if (GOOGLE_MAPS_API_KEY && GOOGLE_PLACE_ID) {
        const reviewsSection = document.getElementById('reviews');
        if ('IntersectionObserver' in window) {
            const googleObserver = new IntersectionObserver(entries => {
                if (entries.some(e => e.isIntersecting)) {
                    googleObserver.disconnect();
                    showGoogleReviews();
                }
            }, { rootMargin: '600px 0px' });
            googleObserver.observe(reviewsSection);
        } else {
            showGoogleReviews();
        }
    }

    // Keyboard navigation for accessibility
    document.addEventListener('keydown', function(e) {
        const modalOpen = modal.style.display === 'block';
        if (e.key === 'Escape') {
            if (modalOpen) closeModal();

            // Close mobile menu
            if (navMenu.classList.contains('active')) {
                setMenu(false);
                hamburger.focus();
            }
        }
        if (modalOpen && e.key === 'ArrowRight') showImage(currentIndex + 1);
        if (modalOpen && e.key === 'ArrowLeft') showImage(currentIndex - 1);
    });

    updateReviewButtons();
});
