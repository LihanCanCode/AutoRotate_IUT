const { exec } = require('child_process');
const logger = require('./logger');

/**
 * Sends a native Windows toast notification.
 * Uses PowerShell with -EncodedCommand to avoid any string escaping/quoting issues.
 */
function notify(title, message) {
  logger.info(`[Notifier] Sending notification: ${title} - ${message}`);

  // Escape single quotes inside PowerShell strings
  const escapedTitle = title.replace(/'/g, "''");
  const escapedMessage = message.replace(/'/g, "''");

  // PowerShell script block
  const psScript = `
    [void] [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');
    $notification = New-Object System.Windows.Forms.NotifyIcon;
    $notification.Icon = [System.Drawing.SystemIcons]::Information;
    $notification.BalloonTipIcon = 'Info';
    $notification.BalloonTipTitle = '${escapedTitle}';
    $notification.BalloonTipText = '${escapedMessage}';
    $notification.Visible = $true;
    $notification.ShowBalloonTip(5000);
  `.trim();

  // Convert script to UTF-16LE and then base64 for PowerShell -EncodedCommand
  const utf16leBuffer = Buffer.from(psScript, 'utf16le');
  const base64Script = utf16leBuffer.toString('base64');

  exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${base64Script}`, (error) => {
    if (error) {
      logger.error(`[Notifier] Failed to send notification: ${error.message}`);
    }
  });
}

module.exports = { notify };
