import {Component, inject} from '@angular/core';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {TranslateService} from '@ngx-translate/core';

/**
 * Switches the active locale used by the translation service.
 */
@Component({
  selector: 'app-language-switcher',
  imports: [
    MatButtonToggleModule
  ],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.css'
})
export class LanguageSwitcher {
  /**
   * The currently selected language code.
   */
  protected currentLang: string = 'en';

  /**
   * List of available language codes.
   */
  protected languages: string[];

  /**
   * Translation service instance.
   */
  private translate: TranslateService;

  /**
   * Creates an instance of LanguageSwitcherComponent.
   * Initializes the current language from the translation service.
   */
  constructor() {
    this.translate = inject(TranslateService);
    this.translate.addLangs(['en', 'es']);
    this.translate.setDefaultLang('en');
    if (!this.translate.currentLang) {
      this.translate.use('en');
    }
    this.currentLang = this.translate.currentLang ?? 'en';
    this.languages = ['en', 'es'];
  }

  /**
   * Changes the application's current language.
   * Updates both the translation service and the component's local state.
   *
   * @param language - The language code to switch to (e.g., 'en', 'es')
   */
  useLanguage(language: string) {
    this.translate.use(language);
    this.currentLang = language;
  }
}
