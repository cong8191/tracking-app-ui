import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    var bgTask: UIBackgroundTaskIdentifier = .invalid

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // KÍCH HOẠT NGAY LẬP TỨC TỪ MILLISECOND ĐẦU TIÊN KHI NGÓN TAY VỪA CHẠM VUỐT VỀ HOME
        if self.bgTask == .invalid {
            self.bgTask = application.beginBackgroundTask(withName: "CapacitorNativeUploadTask") {
                application.endBackgroundTask(self.bgTask)
                self.bgTask = .invalid
            }
        }
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // ĐẢM BẢO CHẮC CHẮN NATIVE TASK ĐÃ ĐƯỢC KÍCH HOẠT
        if self.bgTask == .invalid {
            self.bgTask = application.beginBackgroundTask(withName: "CapacitorNativeUploadTask") {
                application.endBackgroundTask(self.bgTask)
                self.bgTask = .invalid
            }
        }
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Tắt task ngầm khi quay lại màn hình chính
        if self.bgTask != .invalid {
            application.endBackgroundTask(self.bgTask)
            self.bgTask = .invalid
        }
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
