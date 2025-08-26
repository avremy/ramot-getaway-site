document.addEventListener('DOMContentLoaded', function() {
    // Initialize EmailJS with your public key
    emailjs.init('gO9gUVHiJYer7EotG'); // Replace with your actual public key from EmailJS dashboard
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    hamburger.addEventListener('click', function() {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', function() {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Header scroll effect and floating WhatsApp button
    const whatsappFloat = document.getElementById('whatsappFloat');
    
    window.addEventListener('scroll', function() {
        const header = document.querySelector('.header');
        const scrollY = window.scrollY;
        
        // Header background change
        if (scrollY > 100) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
        }
        
        // Show/hide floating WhatsApp button
        if (scrollY > 300) {
            whatsappFloat.classList.add('show');
        } else {
            whatsappFloat.classList.remove('show');
        }
    });

    // Gallery modal
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const caption = document.getElementById('caption');
    const close = document.querySelector('.close');

    document.querySelectorAll('.gallery-item img').forEach(img => {
        img.addEventListener('click', function() {
            modal.style.display = 'block';
            modalImg.src = this.src;
            caption.innerHTML = this.alt;
        });
    });

    close.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Booking form validation and handling
    const bookingForm = document.getElementById('bookingForm');
    const checkinInput = document.getElementById('checkin');
    const checkoutInput = document.getElementById('checkout');

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    checkinInput.min = today;
    checkoutInput.min = today;

    // Update checkout minimum date when checkin changes
    checkinInput.addEventListener('change', function() {
        const checkinDate = new Date(this.value);
        checkinDate.setDate(checkinDate.getDate() + 1); // Minimum 1 night stay
        checkoutInput.min = checkinDate.toISOString().split('T')[0];
        
        // Clear checkout if it's before new minimum
        if (checkoutInput.value && new Date(checkoutInput.value) <= new Date(this.value)) {
            checkoutInput.value = '';
        }
    });

    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const checkinDate = new Date(formData.get('checkin'));
        const checkoutDate = new Date(formData.get('checkout'));
        const adults = formData.get('adults');
        const children = formData.get('children');
        const crib = formData.get('crib') ? 'Yes' : 'No';

        // Validate dates
        if (checkoutDate <= checkinDate) {
            alert('Check-out date must be after check-in date');
            return;
        }

        // Calculate nights
        const timeDiff = checkoutDate - checkinDate;
        const nights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Processing...';
        submitBtn.disabled = true;

        // Prepare template parameters for EmailJS
        const templateParams = {
            checkin: checkinDate.toLocaleDateString(),
            checkout: checkoutDate.toLocaleDateString(),
            nights: nights,
            adults: adults,
            children: children,
            crib: crib,
            from_name: 'Website Booking', // You can add name field to form if needed
            from_email: 'booking@ramotgetaway.com', // Your email
            phone: 'Not provided' // You can add phone field to form if needed
        };

        // Send email via EmailJS
        emailjs.send('service_zov0yer', 'template_y5stmvv', templateParams)
            .then(function(response) {
                console.log('Booking email sent successfully:', response.status, response.text);
                
                // Create booking summary for WhatsApp
                const bookingSummary = `
Booking Request:
Check-in: ${checkinDate.toLocaleDateString()}
Check-out: ${checkoutDate.toLocaleDateString()}
Nights: ${nights}
Adults: ${adults}
Children: ${children}
Crib needed: ${crib}

Please confirm availability and pricing.
                `;

                // Show success message
                alert('Thank you! Your booking request has been sent. We will contact you soon to confirm availability.');
                
                // Create WhatsApp link with booking details
                const phoneNumber = '+972559953030';
                const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(bookingSummary)}`;
                
                // Open WhatsApp
                window.open(whatsappURL, '_blank');
                
                // Reset form
                bookingForm.reset();
            })
            .catch(function(error) {
                console.error('Failed to send booking email:', error);
                
                // Fallback to WhatsApp only
                const bookingSummary = `
Booking Request:
Check-in: ${checkinDate.toLocaleDateString()}
Check-out: ${checkoutDate.toLocaleDateString()}
Nights: ${nights}
Adults: ${adults}
Children: ${children}
Crib needed: ${crib}

Please confirm availability and pricing.
                `;

                const phoneNumber = '+972559953030';
                const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(bookingSummary)}`;
                
                alert('Your booking request will be sent via WhatsApp.');
                window.open(whatsappURL, '_blank');
                
                bookingForm.reset();
            })
            .finally(function() {
                // Reset button state
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

        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
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
        emailjs.send('service_zov0yer', 'template_mzckjrc', templateParams)
            .then(function(response) {
                console.log('Contact email sent successfully:', response.status, response.text);
                
                // Show success message
                alert('Thank you for your message! We have received your inquiry and will respond soon.');
                
                // Reset form
                contactForm.reset();
            })
            .catch(function(error) {
                console.error('Failed to send contact email:', error);
                
                alert('There was an error sending your message. Please try again or contact us directly.');
            })
            .finally(function() {
                // Reset button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
    });

    // Animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.amenity-card, .review-card, .gallery-item').forEach(el => {
        observer.observe(el);
    });

    // Parallax effect for hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero');
        const rate = scrolled * -0.5;
        
        if (hero && window.innerWidth > 768) {
            hero.style.backgroundPosition = `center ${rate}px`;
        }
    });

    // Guest counter validation
    const adultsSelect = document.getElementById('adults');
    const childrenSelect = document.getElementById('children');

    function validateGuestCount() {
        const adults = parseInt(adultsSelect.value);
        const children = parseInt(childrenSelect.value);
        const total = adults + children;

        if (total > 4) {
            alert('Maximum 4 guests allowed (2 adults + 2 children)');
            childrenSelect.value = Math.max(0, 4 - adults);
        }
    }

    adultsSelect.addEventListener('change', validateGuestCount);
    childrenSelect.addEventListener('change', validateGuestCount);

    // Add reviews functionality (for manual review addition)
    window.addReview = function(name, rating, text, date) {
        const reviewsGrid = document.getElementById('reviewsGrid');
        const reviewCard = document.createElement('div');
        reviewCard.className = 'review-card';
        
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        
        reviewCard.innerHTML = `
            <div class="review-stars">${stars}</div>
            <p class="review-text">"${text}"</p>
            <div class="review-author">
                <strong>${name}</strong>
                <span class="review-date">${date}</span>
            </div>
        `;
        
        reviewsGrid.appendChild(reviewCard);
    };

    // Keyboard navigation for accessibility
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Close modal
            if (modal.style.display === 'block') {
                modal.style.display = 'none';
            }
            
            // Close mobile menu
            if (navMenu.classList.contains('active')) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        }
    });

    // Image lazy loading fallback for older browsers
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    // Reviews from Airbnb guests
    addReview("Merril", 5, "This was quite a find as the apartment was clean, had a washer/dryer, good sunlight, near several parks, walking distance to Dolev and the Mercaz, was on the ground floor and allows for pets! Also, the host was very responsive even though he was traveling!", "April 2025");
    
    addReview("David", 4, "My wife and I genuinely enjoyed our two-week stay at Avremy's apartment in Bet Shemesh Aleph. Once we settled in, we began regarding it as 'cozy comfy,' just big enough to meet all our needs in a charming and comfortable way. The apartment is very modern, and it is designed to maximize every square inch of space.", "January 2025");
    
    addReview("Lisa", 5, "This is our 4th time staying at this location. The hosts are kind and thoughtful. This ground level apartment is a modest size but it is quite perfect for a couple. All appliances and accommodations worked well. The bathroom is always clean, and the refrigerator is a perfect size.", "February 2025");
    
    addReview("Diane", 5, "Avremy was a very helpful host with all our requests. The place was conveniently located for our Shabbat in RBS and the place was very clean and well maintained. Would definitely stay again.", "September 2024");
    
    addReview("Libby", 5, "The location was good. A few minutes drive to grocery stores, and parks within walking distance. We liked that it was a quiet and private neighborhood and on the ground floor. We also really appreciated having parking right in front.", "November 2024");
    
    addReview("Monica", 5, "The place is small but very well equipped. It has a private entrance and location is well located in the town. The host was responsive and helpful. Overall it served well for 2 people.", "June 2024");
    
    addReview("Jerry", 5, "This is the second time we stayed in this AirBnb. The hosts checked in with us periodically to ensure that everything was ok. We felt very comfortable in the apartment. The location is close to several bus lines, and in walking distance of several grocery stores.", "October 2023");
    
    addReview("Carol", 4, "This lovely little apartment is a real gem. It is in a very convenient location and unusual for its size in that it has a separate bedroom. All the other 2 person occupancy apartments in the area we checked out are studios.", "August 2024");
    
    addReview("Daniel", 5, "The host is very nice and friendly. The apartment is nice and comfortable, the area is quiet and private. We enjoyed ourselves very much. Thank you :)", "August 2024");
    
    addReview("Romy", 5, "It was a perfect stay. Super clean, excellent shower and appliances a/c and had everything we needed. Centrally located, beautifully decorated and most of all very helpful host. Avremy was always there for anything we needed.", "September 2022");
    
    addReview("Quint", 5, "A very nice and helpful host. The apartment has corresponded to the specifications. There is a very uncomplicated access to the apartment. In front of the building is always some parking space free. The people on site are all very nice.", "May 2023");
    
    addReview("Rebecca", 5, "My good friends stayed here for two nights to be close to family for a bar mitzvah. It was perfect: walking distance on Shabat but still their own space. Quiet and clean. Good heating for the very cold weather we had.", "February 2023");
    
    addReview("Lee", 5, "We're picky people but have no complaints after staying here. It fit our needs perfectly.", "August 2023");
    
    addReview("Shana", 5, "Accommodation was great - perfect for what we needed. Small and compact, good AC, great location. Avremi was very helpful and friendly. I'm sure we'll be back again in the future. Would highly recommend this apartment.", "June 2022");

    console.log('Ramot Getaway website loaded successfully!');
});