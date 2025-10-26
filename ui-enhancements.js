// UI Enhancements for Professional Look

class UIEnhancements {
  static init() {
    this.addLoadingStates();
    this.addAnimations();
    this.addTooltips();
    this.addProgressBars();
    this.enhanceCards();
  }

  // Add loading states to buttons
  static addLoadingStates() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn')) {
        const btn = e.target;
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        btn.disabled = true;
        
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }, 1000);
      }
    });
  }

  // Add smooth animations
  static addAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in');
        }
      });
    });

    document.querySelectorAll('.section, .stat-card').forEach(el => {
      observer.observe(el);
    });
  }

  // Add tooltips
  static addTooltips() {
    document.querySelectorAll('[title]').forEach(el => {
      el.addEventListener('mouseenter', (e) => {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = e.target.title;
        tooltip.style.cssText = `
          position: absolute;
          background: var(--bg-card);
          color: var(--text-primary);
          padding: 8px 12px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          box-shadow: var(--shadow-lg);
          z-index: 1000;
          pointer-events: none;
          border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        document.body.appendChild(tooltip);
        
        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
        
        e.target.title = '';
        
        e.target.addEventListener('mouseleave', () => {
          tooltip.remove();
          e.target.title = tooltip.textContent;
        }, { once: true });
      });
    });
  }

  // Add progress bars for stats
  static addProgressBars() {
    document.querySelectorAll('.stat-card').forEach(card => {
      const value = card.querySelector('.stat-value');
      if (value) {
        const progress = document.createElement('div');
        progress.className = 'progress-bar';
        progress.style.cssText = `
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          margin-top: 12px;
          overflow: hidden;
        `;
        
        const fill = document.createElement('div');
        fill.style.cssText = `
          height: 100%;
          background: var(--gradient-primary);
          width: 0%;
          transition: width 1s ease;
          border-radius: 2px;
        `;
        
        progress.appendChild(fill);
        card.appendChild(progress);
        
        setTimeout(() => {
          fill.style.width = Math.min(parseInt(value.textContent) || 0, 100) + '%';
        }, 500);
      }
    });
  }

  // Enhance card interactions
  static enhanceCards() {
    document.querySelectorAll('.stat-card, .number-box').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-8px) scale(1.02)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) scale(1)';
      });
    });
  }

  // Add particle effect
  static addParticleEffect(element) {
    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: var(--primary);
        border-radius: 50%;
        pointer-events: none;
        animation: particle-float 1s ease-out forwards;
      `;
      
      const rect = element.getBoundingClientRect();
      particle.style.left = (rect.left + rect.width / 2) + 'px';
      particle.style.top = (rect.top + rect.height / 2) + 'px';
      
      document.body.appendChild(particle);
      
      setTimeout(() => particle.remove(), 1000);
    }
  }

  // Enhanced toast notifications
  static showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      <span>${message}</span>
    `;
    
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
      color: white;
      padding: 16px 20px;
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: 1001;
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Add particle animation CSS
const particleCSS = `
@keyframes particle-float {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) scale(0);
    opacity: 0;
  }
}
`;

const style = document.createElement('style');
style.textContent = particleCSS;
document.head.appendChild(style);

// Override existing showToast function
window.showToast = UIEnhancements.showToast;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  UIEnhancements.init();
});

window.UIEnhancements = UIEnhancements;