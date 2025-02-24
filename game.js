class Game {
    constructor() {
        // Nastavení pro mobilní zařízení
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.sensitivity = 1.0; // Výchozí citlivost
        this.lastTap = null; // Pro detekci double-tap
        this.thrustIndicator = null; // Pro vizuální indikátor tahu
        this.player = document.getElementById('player');
        this.gameContainer = document.querySelector('.game-container');
        this.gameMenu = document.querySelector('.game-menu');
        this.gameOver = document.querySelector('.game-over');
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.finalScoreElement = document.getElementById('finalScore');
        this.finalHighScoreElement = document.getElementById('finalHighScore');
        this.newRecordElement = document.querySelector('.new-record');
        this.startButton = document.getElementById('startGame');
        this.restartButton = document.getElementById('restartGame');
        
        // Načtení high score z localStorage
        this.highScore = parseInt(localStorage.getItem('cosmicCollectorHighScore')) || 0;
        this.updateHighScoreDisplay();
        
        this.score = 0;
        this.isPlaying = false;
        this.playerPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.speed = 0;
        this.maxSpeed = 8;
        this.acceleration = 0.5;
        this.deceleration = 0.95;
        this.rotationSpeed = 5;
        this.direction = 0;
        this.isThrusting = false;

        // Power-up systém
        this.powerups = [];
        this.activePowerups = new Set();
        this.powerupTypes = ['shield', 'triple-shot', 'time-slow', 'magnet', 'speed-boost', 'rapid-fire'];
        this.soundManager = new SoundManager();
        this.powerupDuration = 5000; // 5 sekund
        this.powerupSpawnInterval = null;
        
        // Progresivní obtížnost
        this.level = 1;
        this.baseObstacleSpeed = 2;
        this.obstacleSpeedMultiplier = 1;
        this.baseObstacleSpawnRate = 2000;
        this.obstacleSpawnRate = this.baseObstacleSpawnRate;
        
        // Střelba
        this.projectiles = [];
        this.projectileSpeed = 15;
        this.canShoot = true;
        this.shootCooldown = 250; // ms
        
        this.collectibles = [];
        this.obstacles = [];
        this.gameLoop = null;
        this.spawnInterval = null;
        this.obstacleSpeed = 2;
        this.keysPressed = new Set();
        
        this.init();
    }
    
    init() {
        // Vytvoření indikátoru tahu
        this.thrustIndicator = document.createElement('div');
        this.thrustIndicator.className = 'thrust-indicator';
        this.gameContainer.appendChild(this.thrustIndicator);
        
        // Přidání ovládacích prvků pro mobilní zařízení
        if (this.isMobile) {
            this.createMobileControls();
        }
        this.startButton.addEventListener('click', () => this.startGame());
        this.restartButton.addEventListener('click', () => {
            this.gameOver.classList.add('hidden');
            this.startGame();
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        document.addEventListener('keypress', (e) => this.handleKeyPress(e));
        
        // Touch controls
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isTouching = false;
        
        this.gameContainer.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.gameContainer.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.gameContainer.addEventListener('touchend', () => this.handleTouchEnd());
        
        // Shoot button for mobile
        const shootButton = document.createElement('button');
        shootButton.className = 'mobile-shoot-button';
        shootButton.textContent = '🔫';
        this.gameContainer.appendChild(shootButton);
        
        shootButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.isPlaying) this.shoot();
        });
    }
    
    handleKeyPress(e) {
        if (!this.isPlaying) return;
        
        // Střelba mezerníkem
        if (e.code === 'Space' && this.canShoot) {
            this.shoot();
        }
    }
    
    shoot() {
        if (!this.canShoot) return;
        
        const createProjectile = (angle) => {
            const radians = angle * Math.PI / 180;
            const projectile = {
                x: this.playerPos.x + Math.sin(radians) * 30, // Začátek před lodí
                y: this.playerPos.y - Math.cos(radians) * 30,
                vx: Math.sin(radians) * this.projectileSpeed,
                vy: -Math.cos(radians) * this.projectileSpeed,
                element: document.createElement('div')
            };
            
            // Vytvoření projektilu
            projectile.element.className = 'projectile';
            projectile.element.style.left = `${projectile.x}px`;
            projectile.element.style.top = `${projectile.y}px`;
            this.gameContainer.appendChild(projectile.element);
            
            this.projectiles.push(projectile);
            return projectile;
        };
        
        let mainProjectile;
        if (this.activePowerups.has('triple-shot')) {
            // Střelba do tří směrů
            mainProjectile = createProjectile(this.direction);
            createProjectile(this.direction - 15);
            createProjectile(this.direction + 15);
        } else {
            mainProjectile = createProjectile(this.direction);
        }
        
        // Přidání záblesku
        const flash = document.createElement('div');
        flash.className = 'shoot-flash';
        flash.style.left = mainProjectile.x + 'px';
        flash.style.top = mainProjectile.y + 'px';
        this.gameContainer.appendChild(flash);
        setTimeout(() => flash.remove(), 200);
        
        // Cooldown střelby
        this.canShoot = false;
        setTimeout(() => this.canShoot = true, this.shootCooldown);
    }
    
    startGame() {
        // Reset score a level
        this.score = 0;
        this.level = 1;
        this.scoreElement.textContent = '0';
        this.isPlaying = true;
        
        // Reset UI
        this.gameContainer.classList.add('active');
        this.gameMenu.classList.add('hidden');
        this.gameOver.classList.add('hidden');
        this.newRecordElement.classList.add('hidden');
        
        // Reset power-ups
        this.powerups.forEach(p => p.element.remove());
        this.powerups = [];
        this.activePowerups.clear();
        this.player.classList.remove('shielded', 'triple-shot', 'time-slow', 'magnet');
        
        // Clear existing elements
        this.collectibles.forEach(c => c.element.remove());
        this.obstacles.forEach(o => o.element.remove());
        this.collectibles = [];
        this.obstacles = [];
        
        // Reset player position and movement
        this.playerPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.velocity = { x: 0, y: 0 };
        this.direction = 0;
        this.speed = 0;
        this.isThrusting = false;

        // Nastavení počáteční pozice a rotace rakety
        this.player.style.left = `${this.playerPos.x}px`;
        this.player.style.top = `${this.playerPos.y}px`;
        this.player.style.transform = `translate(-50%, -50%) rotate(${this.direction}deg)`;
        
        // Reset game speed
        this.obstacleSpeedMultiplier = 1;
        this.obstacleSpawnRate = this.baseObstacleSpawnRate;
        
        // Start game loops
        this.gameLoop = setInterval(() => this.update(), 16);
        this.spawnInterval = setInterval(() => this.spawnElements(), this.obstacleSpawnRate);
        this.powerupSpawnInterval = setInterval(() => this.spawnPowerup(), 10000);
        
        // Spawn initial elements
        this.spawnElements();
    }
    
    handleKeyDown(e) {
        if (!this.isPlaying) return;
        this.keysPressed.add(e.key.toLowerCase());
    }

    handleKeyUp(e) {
        if (!this.isPlaying) return;
        this.keysPressed.delete(e.key.toLowerCase());
    }
    
    handleTouchStart(e) {
        if (!this.isPlaying) return;
        e.preventDefault();
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.isTouching = true;
        
        // Detekce double-tap pro rychlou střelbu
        const now = Date.now();
        if (this.lastTap && (now - this.lastTap) < 300) {
            this.shoot();
            this.lastTap = null;
        } else {
            this.lastTap = now;
        }
        
        // Vibrační odezva při dotyku
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
    
    handleTouchMove(e) {
        if (!this.isPlaying || !this.isTouching) return;
        e.preventDefault();
        const touch = e.touches[0];
        
        // Vypočítáme směr pohybu s kalibrovanou citlivostí
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        
        // Aktualizujeme směr lodi s plynulejší rotací
        const targetAngle = Math.atan2(deltaX, -deltaY) * 180 / Math.PI;
        const angleDiff = targetAngle - this.direction;
        
        // Plynulá rotace
        if (Math.abs(angleDiff) > 180) {
            if (angleDiff > 0) {
                this.direction += (angleDiff - 360) * 0.1;
            } else {
                this.direction += (angleDiff + 360) * 0.1;
            }
        } else {
            this.direction += angleDiff * 0.1;
        }
        
        // Normalizace úhlu
        this.direction = ((this.direction % 360) + 360) % 360;
        
        // Adaptivní práh pro aktivaci tahu
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const threshold = window.innerWidth * 0.05; // 5% šířky obrazovky
        this.isThrusting = distance > threshold;
        
        // Vizuální indikátor směru
        this.updateThrustIndicator(distance > threshold, this.direction);
    }
    
    handleTouchEnd() {
        this.isTouching = false;
        this.isThrusting = false;
        this.thrustIndicator.classList.remove('active');
    }

    createMobileControls() {
        // Vytvoření tlačítka pro střelbu
        const shootButton = document.createElement('button');
        shootButton.className = 'mobile-shoot-button';
        shootButton.textContent = '🔫';
        this.gameContainer.appendChild(shootButton);

        // Přidání událostí pro tlačítko střelby
        shootButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.isPlaying && this.canShoot) {
                this.shoot();
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }
        });

        // Zamezení výchozímu chování prohlížeče
        this.gameContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    updateThrustIndicator(isActive, angle) {
        if (!this.thrustIndicator) return;

        if (isActive) {
            this.thrustIndicator.classList.add('active');
            this.thrustIndicator.style.left = this.touchStartX + 'px';
            this.thrustIndicator.style.top = this.touchStartY + 'px';
            this.thrustIndicator.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        } else {
            this.thrustIndicator.classList.remove('active');
        }
    }

    createExplosion(x, y) {
        // Vytvoření exploze
        const explosion = document.createElement('div');
        explosion.className = 'explosion';
        explosion.style.left = x + 'px';
        explosion.style.top = y + 'px';
        this.gameContainer.appendChild(explosion);

        // Přidání částic
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'explosion-particles';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            
            // Náhodný směr částic
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 200 + 50;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);
            
            this.gameContainer.appendChild(particle);
            
            // Odstranění částic po animaci
            setTimeout(() => particle.remove(), 1000);
        }

        // Otřesy obrazovky
        document.body.classList.add('screen-shake');
        setTimeout(() => {
            document.body.classList.remove('screen-shake');
            explosion.remove();
        }, 500);

        // Přehrání zvuku exploze s basovým efektem
        this.soundManager.play('explosion');
        
        // Vytvoření basového efektu pomocí Web Audio API
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(40, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
            console.log('Web Audio API není podporováno');
        }
    }

    updateShip() {
        // Rotace
        if (this.keysPressed.has('a') || this.keysPressed.has('arrowleft')) {
            this.direction -= this.rotationSpeed;
        }
        if (this.keysPressed.has('d') || this.keysPressed.has('arrowright')) {
            this.direction += this.rotationSpeed;
        }

        // Pohyb vpřed/vzad
        this.isThrusting = false;
        if (this.keysPressed.has('w') || this.keysPressed.has('arrowup')) {
            this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration);
            this.isThrusting = true;
        } else if (this.keysPressed.has('s') || this.keysPressed.has('arrowdown')) {
            this.speed = Math.max(-this.maxSpeed/2, this.speed - this.acceleration);
        } else {
            // Zpomalování
            this.speed *= this.deceleration;
            if (Math.abs(this.speed) < 0.1) this.speed = 0;
        }

        // Výpočet nové pozice
        const radians = this.direction * Math.PI / 180;
        this.playerPos.x += Math.sin(radians) * this.speed;
        this.playerPos.y -= Math.cos(radians) * this.speed;

        // Plynulý přechod přes okraje obrazovky
        const playerSize = 40; // Velikost lodi
        
        if (this.playerPos.x < -playerSize) {
            this.playerPos.x = window.innerWidth + playerSize;
        } else if (this.playerPos.x > window.innerWidth + playerSize) {
            this.playerPos.x = -playerSize;
        }
        
        if (this.playerPos.y < -playerSize) {
            this.playerPos.y = window.innerHeight + playerSize;
        } else if (this.playerPos.y > window.innerHeight + playerSize) {
            this.playerPos.y = -playerSize;
        }

        // Aktualizace vizuálních efektů
        this.player.style.transform = `translate(-50%, -50%) rotate(${this.direction}deg)`;
        this.player.classList.toggle('thrusting', this.isThrusting);
        this.updatePlayerPosition();
    }
    
    updatePlayerPosition() {
        this.player.style.left = `${this.playerPos.x}px`;
        this.player.style.top = `${this.playerPos.y}px`;
    }
    
    spawnElements() {
        // Spawn collectible
        if (this.collectibles.length < 5) {
            const element = document.createElement('div');
            element.className = 'collectible';
            const x = Math.random() * (window.innerWidth - 40) + 20;
            const y = Math.random() * (window.innerHeight - 40) + 20;
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
            this.gameContainer.appendChild(element);
            this.collectibles.push({ element, x, y });
        }
        
        // Spawn obstacle
        if (this.obstacles.length < 3) {
            const element = document.createElement('div');
            element.className = 'obstacle';
            const x = Math.random() * (window.innerWidth - 40) + 20;
            const y = Math.random() * (window.innerHeight - 40) + 20;
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
            this.gameContainer.appendChild(element);
            this.obstacles.push({ element, x, y });
        }
    }
    
    createExplosion(x, y) {
        // Vytvoření exploze
        const explosion = document.createElement('div');
        explosion.className = 'explosion';
        explosion.style.left = x + 'px';
        explosion.style.top = y + 'px';
        this.gameContainer.appendChild(explosion);

        // Přidání částic
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'explosion-particles';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            
            // Náhodný směr částic
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 200 + 50;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);
            
            this.gameContainer.appendChild(particle);
            
            // Odstranění částic po animaci
            setTimeout(() => particle.remove(), 1000);
        }

        // Otřesy obrazovky
        document.body.classList.add('screen-shake');
        setTimeout(() => {
            document.body.classList.remove('screen-shake');
            explosion.remove();
        }, 500);

        // Přehrání zvuku exploze s basovým efektem
        if (this.soundManager) {
            this.soundManager.play('explosion');
        }
        
        // Vytvoření basového efektu pomocí Web Audio API
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(40, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
            console.log('Web Audio API není podporováno');
        }
    }

    checkCollisions() {
        const playerRadius = 20;
        const collectibleRadius = 10;
        const obstacleRadius = 15;
        const projectileRadius = 2;
        
        // Kontrola kolekce bodů
        this.collectibles = this.collectibles.filter(collectible => {
            const dx = this.playerPos.x - collectible.x;
            const dy = this.playerPos.y - collectible.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < playerRadius + collectibleRadius) {
                collectible.element.remove();
                this.score += 10;
                this.scoreElement.textContent = this.score;
                return false;
            }
            return true;
        });
        
        // Kontrola kolize s překážkami
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            
            // Kolize s hráčem
            const dxPlayer = this.playerPos.x - obstacle.x;
            const dyPlayer = this.playerPos.y - obstacle.y;
            const distancePlayer = Math.sqrt(dxPlayer * dxPlayer + dyPlayer * dyPlayer);
            
            if (distancePlayer < playerRadius + obstacleRadius && !this.activePowerups.has('shield')) {
                // Vyčištění všech herních prvků
                this.obstacles.forEach(o => o.element.remove());
                this.obstacles = [];
                this.collectibles.forEach(c => c.element.remove());
                this.collectibles = [];
                this.projectiles.forEach(p => p.element.remove());
                this.projectiles = [];
                
                // Vytvoření výbuchu na místě kolize
                this.createExplosion(this.playerPos.x, this.playerPos.y);
                
                // Ukončení hry
                this.endGame();
                return;
            }
            
            // Kolize s projektily
            for (let j = this.projectiles.length - 1; j >= 0; j--) {
                const projectile = this.projectiles[j];
                const dx = projectile.x - obstacle.x;
                const dy = projectile.y - obstacle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < projectileRadius + obstacleRadius) {
                    // Vytvoření výbuchu
                    this.createExplosion(obstacle.x, obstacle.y);
                    
                    // Odstranění projektilu a překážky
                    projectile.element.remove();
                    this.projectiles.splice(j, 1);
                    obstacle.element.remove();
                    this.obstacles.splice(i, 1);
                    
                    // Přidání bodů
                    this.score += 20;
                    this.scoreElement.textContent = this.score;
                    break;
                }
            }
        };
    }
    
    spawnPowerup() {
        if (!this.isPlaying) return;
        
        const type = this.powerupTypes[Math.floor(Math.random() * this.powerupTypes.length)];
        const powerup = {
            type,
            x: Math.random() * (window.innerWidth - 100) + 50,
            y: Math.random() * (window.innerHeight - 100) + 50,
            element: document.createElement('div')
        };
        
        powerup.element.className = `powerup ${type}`;
        powerup.element.style.left = powerup.x + 'px';
        powerup.element.style.top = powerup.y + 'px';
        this.gameContainer.appendChild(powerup.element);
        this.powerups.push(powerup);
        
        // Automatické odstranění po 10 sekundách
        setTimeout(() => {
            const index = this.powerups.indexOf(powerup);
            if (index > -1) {
                this.powerups.splice(index, 1);
                powerup.element.remove();
            }
        }, 10000);
    }

    activatePowerup(type) {
        this.activePowerups.add(type);
        this.player.classList.add(type);
        
        switch(type) {
            case 'shield':
                // Implementováno v checkCollisions()
                break;
            case 'triple-shot':
                // Implementováno v shoot()
                break;
            case 'time-slow':
                this.obstacleSpeedMultiplier = 0.5;
                break;
            case 'magnet':
                // Implementováno v updateCollectibles()
                break;
        }
        
        setTimeout(() => {
            this.activePowerups.delete(type);
            this.player.classList.remove(type);
            if (type === 'time-slow') {
                this.obstacleSpeedMultiplier = 1;
            }
        }, this.powerupDuration);
    }

    checkPowerupCollisions() {
        const playerRadius = 20;
        const powerupRadius = 15;

        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const powerup = this.powerups[i];
            const dx = powerup.x - this.playerPos.x;
            const dy = powerup.y - this.playerPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < playerRadius + powerupRadius) {
                this.activatePowerup(powerup.type);
                powerup.element.remove();
                this.powerups.splice(i, 1);
            }
        }
    }

    checkLevelProgress() {
        const newLevel = Math.floor(this.score / 100) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            // Zvýšení obtížnosti
            clearInterval(this.spawnInterval);
            this.obstacleSpawnRate = Math.max(500, this.baseObstacleSpawnRate - (this.level - 1) * 200);
            this.spawnInterval = setInterval(() => this.spawnElements(), this.obstacleSpawnRate);
        }
    }

    update() {
        if (!this.isPlaying) return;
        
        this.updateShip();
        
        // Aktualizace projektilů
        this.projectiles = this.projectiles.filter(projectile => {
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;
            
            // Odstranění projektilů mimo obrazovku
            if (projectile.x < 0 || projectile.x > window.innerWidth ||
                projectile.y < 0 || projectile.y > window.innerHeight) {
                projectile.element.remove();
                return false;
            }
            
            projectile.element.style.left = `${projectile.x}px`;
            projectile.element.style.top = `${projectile.y}px`;
            return true;
        });
        
        // Pohyb překážek
        const currentSpeed = this.baseObstacleSpeed * this.obstacleSpeedMultiplier * this.level;
        this.obstacles.forEach(obstacle => {
            const time = Date.now() / 1000;
            
            obstacle.x += Math.cos(time) * currentSpeed;
            obstacle.y += Math.sin(time) * currentSpeed;
            
            if (obstacle.x < 0) obstacle.x = window.innerWidth;
            if (obstacle.x > window.innerWidth) obstacle.x = 0;
            if (obstacle.y < 0) obstacle.y = window.innerHeight;
            if (obstacle.y > window.innerHeight) obstacle.y = 0;
            
            obstacle.element.style.left = `${obstacle.x}px`;
            obstacle.element.style.top = `${obstacle.y}px`;
        });
        
        // Aktualizace powerupů
        this.checkPowerupCollisions();
        
        // Kontrola kolizí
        this.checkCollisions();
        
        // Kontrola levelu
        this.checkLevelProgress();
    }
    
    createExplosion(x, y) {
        const explosion = document.createElement('div');
        explosion.className = 'explosion';
        explosion.style.left = x + 'px';
        explosion.style.top = y + 'px';
        this.gameContainer.appendChild(explosion);

        // Vytvoření expandujícího kruhu
        const ring = document.createElement('div');
        ring.className = 'explosion-ring';
        explosion.appendChild(ring);

        // Vytvoření částic
        const particleCount = 12;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'explosion-particle';
            
            // Náhodná rychlost a úhel
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 3 + Math.random() * 2;
            const distance = 30;
            
            // Animace částice
            particle.style.left = '50%';
            particle.style.top = '50%';
            
            const animate = (timestamp) => {
                const progress = (timestamp - startTime) / 500; // 500ms trvání
                if (progress >= 1) {
                    particle.remove();
                    return;
                }
                
                const currentDistance = distance * progress;
                const opacity = 1 - progress;
                const scale = 1 - progress * 0.5;
                
                particle.style.transform = `
                    translate(
                        ${Math.cos(angle) * currentDistance * speed}px,
                        ${Math.sin(angle) * currentDistance * speed}px
                    ) scale(${scale})
                `;
                particle.style.opacity = opacity;
                
                requestAnimationFrame(animate);
            };
            
            const startTime = performance.now();
            explosion.appendChild(particle);
            requestAnimationFrame(animate);
        }

        // Odstranění výbuchu po dokončení animace
        setTimeout(() => explosion.remove(), 500);
    }

    updateHighScoreDisplay() {
        this.highScoreElement.textContent = this.highScore;
        this.finalHighScoreElement.textContent = this.highScore;
    }

    checkHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('cosmicCollectorHighScore', this.highScore);
            this.updateHighScoreDisplay();
            this.newRecordElement.classList.remove('hidden');
            return true;
        }
        return false;
    }

    endGame() {
        this.isPlaying = false;
        clearInterval(this.gameLoop);
        clearInterval(this.spawnInterval);
        clearInterval(this.powerupSpawnInterval);
        
        // Aktualizace skóre a kontrola rekordu
        this.finalScoreElement.textContent = this.score;
        this.checkHighScore();
        
        // Vyčištění power-upů
        this.powerups.forEach(powerup => powerup.element.remove());
        this.powerups = [];
        this.activePowerups.clear();
        this.player.className = 'player';
        
        // Zobrazení obrazovky konce hry
        setTimeout(() => {
            this.gameContainer.classList.remove('active');
            this.gameOver.classList.remove('hidden');
        }, 1000); // Počkáme 1s na dokončení animace výbuchu
    }
}

// Initialize game when window loads
window.addEventListener('load', () => {
    new Game();
});
